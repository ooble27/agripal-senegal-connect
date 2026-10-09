// Fonction edge Ooble : suppression du compte par le client lui-même.
//
// POST JSON { confirm: "SUPPRIMER" | "DELETE", lang?: "fr" | "en" }, avec le
// jeton de l'utilisateur connecté (vérifié par Supabase, JWT obligatoire).
//
// La base décide (public.close_account) :
//   • « delete » : aucun ordre, aucune vérification, aucun dossier de
//     conformité. L'utilisateur est supprimé ; son profil et ses données
//     partent avec lui (cascade).
//   • « closed » : Ooble doit garder 5 ans les dossiers d'identité et
//     d'opérations (CANAFE). Le profil, les ordres et les vérifications
//     restent ; le reste est effacé (destinataires enregistrés,
//     notifications, question Interac, téléphone). La connexion est
//     bloquée et l'adresse e-mail libérée (remplacée par une adresse
//     interne), pour pouvoir rouvrir un compte plus tard.
// Refusée tant qu'un ordre est en cours (409) et pour un compte de l'équipe
// (403). Un courriel de confirmation part à l'adresse d'origine.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const MAIL = {
  fr: {
    deleted: {
      subject: "Votre compte Ooble est supprimé",
      html: `<p>Bonjour,</p>
<p>Votre compte Ooble a bien été supprimé, avec les informations qui y étaient liées.</p>
<p>Si vous n'êtes pas à l'origine de cette demande, répondez simplement à ce message.</p>`,
    },
    closed: {
      subject: "Votre compte Ooble est fermé",
      html: `<p>Bonjour,</p>
<p>Votre compte Ooble est fermé : vous ne pouvez plus vous y connecter, et vos destinataires enregistrés, vos notifications et votre question Interac ont été effacés.</p>
<p>Comme toute entreprise de services monétaires au Canada, Ooble doit conserver vos vérifications d'identité et l'historique de vos opérations pendant 5 ans (exigence du CANAFE). Ces informations ne sont utilisées qu'à cette fin, puis supprimées.</p>
<p>Vous pouvez ouvrir un nouveau compte à tout moment avec la même adresse. Si vous n'êtes pas à l'origine de cette demande, répondez simplement à ce message.</p>`,
    },
  },
  en: {
    deleted: {
      subject: "Your Ooble account has been deleted",
      html: `<p>Hello,</p>
<p>Your Ooble account has been deleted, along with the information linked to it.</p>
<p>If you didn't make this request, just reply to this message.</p>`,
    },
    closed: {
      subject: "Your Ooble account is closed",
      html: `<p>Hello,</p>
<p>Your Ooble account is closed: you can no longer sign in, and your saved recipients, notifications and Interac question have been erased.</p>
<p>Like every money services business in Canada, Ooble must keep your identity verifications and transaction history for 5 years (a FINTRAC requirement). This information is used only for that purpose, then deleted.</p>
<p>You can open a new account at any time with the same address. If you didn't make this request, just reply to this message.</p>`,
    },
  },
} as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST uniquement" }, 405);
  if (!SB_URL || !SERVICE) return json({ error: "Configuration serveur incomplète." }, 500);

  const admin = createClient(SB_URL, SERVICE);
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const { data: auth } = token ? await admin.auth.getUser(token) : { data: { user: null } };
  const user = auth?.user;
  if (!user) return json({ error: "Authentification requise." }, 401);

  let body: { confirm?: string; lang?: string } = {};
  try { body = await req.json(); } catch { /* corps vide */ }
  const lang = body.lang === "en" ? "en" : "fr";
  if (!["SUPPRIMER", "DELETE"].includes((body.confirm ?? "").trim().toUpperCase())) {
    return json({ error: "confirm", message: lang === "en" ? "Type DELETE to confirm." : "Tapez SUPPRIMER pour confirmer." }, 400);
  }

  const { data: prof } = await admin.from("profiles").select("email").eq("id", user.id).maybeSingle();
  const to = prof?.email || user.email || null;

  const { data: mode, error } = await admin.rpc("close_account", { _uid: user.id });
  if (error) {
    if (/ACTIVE_ORDERS/.test(error.message)) return json({ error: "active_orders" }, 409);
    if (/STAFF/.test(error.message)) return json({ error: "staff" }, 403);
    console.error("delete-account: close_account", error);
    return json({ error: "server" }, 500);
  }

  if (mode === "delete") {
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) {
      console.error("delete-account: deleteUser", delErr);
      return json({ error: "server" }, 500);
    }
  } else {
    // Fermeture : données non exigées par la loi effacées, connexion bloquée,
    // adresse e-mail libérée.
    await admin.from("saved_recipients").delete().eq("user_id", user.id);
    await admin.from("push_subscriptions").delete().eq("user_id", user.id);
    const { error: updErr } = await admin.auth.admin.updateUserById(user.id, {
      email: `closed-${user.id}@closed.ooble.ca`,
      email_confirm: true,
      ban_duration: "876000h",
      user_metadata: { ...(user.user_metadata ?? {}), closed: true },
    });
    if (updErr) {
      console.error("delete-account: updateUserById", updErr);
      return json({ error: "server" }, 500);
    }
    await admin.auth.admin.signOut(token, "global").catch(() => {});
  }

  if (to) {
    const m = MAIL[lang][mode === "delete" ? "deleted" : "closed"];
    await fetch(`${SB_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE}` },
      body: JSON.stringify({ to, subject: m.subject, html: m.html }),
    }).catch((e) => console.error("delete-account: courriel", e));
  }

  return json({ ok: true, mode: mode === "delete" ? "deleted" : "closed" });
});
