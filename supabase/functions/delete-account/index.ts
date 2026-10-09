// Fonction edge Ooble : suppression du compte par le client lui-même.
//
// POST JSON { confirm: "SUPPRIMER" | "DELETE", lang?: "fr" | "en" }, avec le
// jeton de l'utilisateur connecté (vérifié par Supabase, JWT obligatoire).
//
// Ooble ne supprime jamais le dossier d'un client : profil, ordres,
// vérifications et destinataires restent en base, sans limite de durée.
// Le compte est fermé (public.close_account inscrit la fermeture au
// registre account_closures), la connexion est bloquée, l'adresse e-mail
// libérée (remplacée par une adresse interne) pour pouvoir rouvrir un compte
// plus tard, et les notifications du téléphone coupées.
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
    subject: "Votre compte Ooble est supprimé",
    html: `<p>Bonjour,</p>
<p>Votre compte Ooble est supprimé : vous ne pouvez plus vous y connecter.</p>
<p>Comme toute entreprise de services monétaires au Canada, Ooble conserve le dossier de ses clients (vérification d'identité et historique des opérations), conformément à ses obligations envers le CANAFE.</p>
<p>Vous pouvez ouvrir un nouveau compte à tout moment avec la même adresse. Si vous n'êtes pas à l'origine de cette demande, répondez simplement à ce message.</p>`,
  },
  en: {
    subject: "Your Ooble account has been deleted",
    html: `<p>Hello,</p>
<p>Your Ooble account has been deleted: you can no longer sign in.</p>
<p>Like every money services business in Canada, Ooble keeps its clients' records (identity verification and transaction history), in line with its obligations to FINTRAC.</p>
<p>You can open a new account at any time with the same address. If you didn't make this request, just reply to this message.</p>`,
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

  const { error } = await admin.rpc("close_account", { _uid: user.id });
  if (error) {
    if (/ACTIVE_ORDERS/.test(error.message)) return json({ error: "active_orders" }, 409);
    if (/STAFF/.test(error.message)) return json({ error: "staff" }, 403);
    console.error("delete-account: close_account", error);
    return json({ error: "server" }, 500);
  }

  // Le dossier reste entier. On coupe seulement l'accès : notifications du
  // téléphone, connexion bloquée, adresse e-mail libérée.
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

  if (to) {
    const m = MAIL[lang];
    await fetch(`${SB_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE}` },
      body: JSON.stringify({ to, subject: m.subject, html: m.html }),
    }).catch((e) => console.error("delete-account: courriel", e));
  }

  return json({ ok: true, mode: "closed" });
});
