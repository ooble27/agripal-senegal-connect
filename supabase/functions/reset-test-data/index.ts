// Fonction edge Ooble : réinitialisation des données de test, et lancement.
//
// Avant le lancement, tout ce qui est en base vient des tests de l'équipe.
// Un administrateur peut tout remettre à zéro depuis le back-office, autant
// de fois qu'il veut. Une fois la plateforme lancée (« Démarrer les
// activités »), la réinitialisation est refusée pour toujours : les dossiers
// des vrais clients se conservent au moins 5 ans (CANAFE).
//
// POST JSON, jeton d'un administrateur connecté (JWT vérifié par Supabase) :
//   { action: "preview" }                      ce qui serait effacé, et l'état
//   { action: "reset", confirm: "REINITIALISER", mail?: bool, logs?: bool }
//   { action: "launch", confirm: "DEMARRER" }  irréversible depuis l'app
//
// Effacé par « reset » : commandes et tout ce qui s'y rattache (paiements
// Interac, envois USDT, dépôts reçus), vérifications d'identité et
// d'entreprise (et leurs documents), destinataires enregistrés, registre de
// conformité, comptes clients (tous sauf ceux de l'équipe). En option : la
// messagerie (mail) et les journaux (activité de l'équipe, assistant IA).
// Gardé : comptes de l'équipe, réglages du règlement automatique, trésorerie
// et soldes, taux, liste des domaines refusés, programme de conformité.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

/** Tables effacées, dans l'ordre (les dépendances d'abord). [table, colonne toujours remplie] */
const CORE: [string, string][] = [
  ["interac_receipts", "id"],
  ["usdt_payouts", "id"],
  ["chain_deposits", "id"],
  ["payment_confirmations", "id"],
  ["blockchain_transactions", "id"],
  ["compliance_flags", "id"],
  ["compliance_declarations", "id"],
  ["compliance_alerts", "id"],
  ["orders", "id"], // order_events suit (cascade)
  ["kyc_verifications", "id"],
  ["business_verifications", "id"],
  ["saved_recipients", "id"],
  ["account_closures", "user_id"],
];
const MAIL: [string, string][] = [["mail_threads", "id"]]; // mail_messages suit (cascade)
const LOGS: [string, string][] = [["ai_alerts", "id"], ["ai_calls", "id"], ["admin_audit_log", "id"]];

const LABEL: Record<string, string> = {
  orders: "Commandes", interac_receipts: "Virements Interac reçus", usdt_payouts: "Envois USDT",
  chain_deposits: "Dépôts USDT reçus (ventes)", payment_confirmations: "Confirmations de paiement",
  blockchain_transactions: "Transactions blockchain", compliance_flags: "Signalements",
  compliance_declarations: "Déclarations CANAFE", compliance_alerts: "Alertes de conformité",
  kyc_verifications: "Vérifications d'identité", business_verifications: "Vérifications d'entreprise",
  saved_recipients: "Destinataires enregistrés", account_closures: "Comptes fermés",
  mail_threads: "Conversations de la messagerie", ai_alerts: "Alertes de l'assistant IA",
  ai_calls: "Questions à l'assistant IA", admin_audit_log: "Journal d'activité de l'équipe",
};

async function count(db: SupabaseClient, table: string): Promise<number> {
  const { count: n, error } = await db.from(table).select("*", { count: "exact", head: true });
  if (error) throw new Error(`${table} : ${error.message}`);
  return n ?? 0;
}

async function staffIds(db: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await db.from("user_roles").select("user_id");
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((r) => r.user_id as string));
}

async function allUsers(db: SupabaseClient): Promise<{ id: string; email?: string }[]> {
  const out: { id: string; email?: string }[] = [];
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    out.push(...data.users.map((u) => ({ id: u.id, email: u.email })));
    if (data.users.length < 1000) break;
  }
  return out;
}

/** Tous les fichiers du dossier de stockage (documents d'identité). */
async function listFiles(db: SupabaseClient, bucket: string, prefix = "", depth = 0): Promise<string[]> {
  const { data, error } = await db.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) throw new Error(`stockage ${bucket} : ${error.message}`);
  const files: string[] = [];
  for (const it of data ?? []) {
    const path = prefix ? `${prefix}/${it.name}` : it.name;
    if (it.id) files.push(path);
    else if (depth < 4) files.push(...await listFiles(db, bucket, path, depth + 1));
  }
  return files;
}

async function state(db: SupabaseClient) {
  const { data } = await db.from("platform_state").select("launched_at, last_reset_at").eq("id", true).maybeSingle();
  return { launchedAt: data?.launched_at ?? null, lastResetAt: data?.last_reset_at ?? null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST uniquement" }, 405);
  if (!SB_URL || !SERVICE) return json({ error: "Configuration serveur incomplète." }, 500);

  const db = createClient(SB_URL, SERVICE, { auth: { persistSession: false } });
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const { data: auth } = token ? await db.auth.getUser(token) : { data: { user: null } };
  const me = auth?.user;
  if (!me) return json({ error: "Authentification requise." }, 401);
  const { data: role } = await db.from("user_roles").select("role").eq("user_id", me.id).eq("role", "admin").maybeSingle();
  if (!role) return json({ error: "Réservé aux administrateurs." }, 403);

  let body: { action?: string; confirm?: string; mail?: boolean; logs?: boolean } = {};
  try { body = await req.json(); } catch { /* corps vide */ }
  const confirm = (body.confirm ?? "").trim().toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  try {
    const st = await state(db);

    if (body.action === "preview") {
      const staff = await staffIds(db);
      const users = await allUsers(db);
      const tables = [...CORE, ...MAIL, ...LOGS];
      const counts = await Promise.all(tables.map(async ([t]) => ({ table: t, label: LABEL[t] ?? t, n: await count(db, t) })));
      const files = await listFiles(db, "kyc");
      return json({
        ok: true, ...st,
        core: counts.filter((c) => CORE.some(([t]) => t === c.table)),
        mail: counts.filter((c) => MAIL.some(([t]) => t === c.table)),
        logs: counts.filter((c) => LOGS.some(([t]) => t === c.table)),
        clients: users.filter((u) => !staff.has(u.id)).length,
        staff: users.filter((u) => staff.has(u.id)).map((u) => u.email ?? u.id),
        documents: files.length,
      });
    }

    if (body.action === "launch") {
      if (confirm !== "DEMARRER") return json({ error: "confirm" }, 400);
      if (st.launchedAt) return json({ ok: true, launchedAt: st.launchedAt });
      const at = new Date().toISOString();
      const { error } = await db.from("platform_state").update({ launched_at: at, launched_by: me.id }).eq("id", true);
      if (error) throw new Error(error.message);
      await db.from("admin_audit_log").insert({
        actor_user_id: me.id, actor_role: "admin", actor_email: me.email, action: "platform.launch", entity_kind: "platform", metadata: { at },
      });
      return json({ ok: true, launchedAt: at });
    }

    if (body.action === "reset") {
      if (st.launchedAt) return json({ error: "launched", message: "La plateforme est lancée : les dossiers clients se conservent 5 ans." }, 409);
      if (confirm !== "REINITIALISER") return json({ error: "confirm" }, 400);

      const done: Record<string, number> = {};
      const tables = [...CORE, ...(body.mail ? MAIL : []), ...(body.logs ? LOGS : [])];
      for (const [t, col] of tables) {
        const n = await count(db, t);
        if (n > 0) {
          const { error } = await db.from(t).delete().not(col, "is", null);
          if (error) throw new Error(`${LABEL[t] ?? t} : ${error.message}`);
        }
        done[t] = n;
      }

      // Documents d'identité (photos des pièces et selfies).
      const files = await listFiles(db, "kyc");
      for (let i = 0; i < files.length; i += 100) {
        const { error } = await db.storage.from("kyc").remove(files.slice(i, i + 100));
        if (error) throw new Error(`documents : ${error.message}`);
      }

      // Comptes clients : tous, sauf ceux de l'équipe.
      const staff = await staffIds(db);
      const failed: string[] = [];
      let removed = 0;
      for (const u of await allUsers(db)) {
        if (staff.has(u.id)) continue;
        const { error } = await db.auth.admin.deleteUser(u.id);
        if (error) failed.push(`${u.email ?? u.id} : ${error.message}`);
        else removed++;
      }

      const at = new Date().toISOString();
      await db.from("platform_state").update({ last_reset_at: at, last_reset_by: me.id }).eq("id", true);
      await db.from("admin_audit_log").insert({
        actor_user_id: me.id, actor_role: "admin", actor_email: me.email, action: "platform.reset_test_data", entity_kind: "platform",
        metadata: { at, tables: done, documents: files.length, clients: removed, failed, mail: !!body.mail, logs: !!body.logs },
      });
      return json({ ok: failed.length === 0, tables: done, documents: files.length, clients: removed, failed, lastResetAt: at });
    }

    return json({ error: "Action inconnue." }, 400);
  } catch (e) {
    console.error("reset-test-data", e);
    return json({ error: "server", message: (e as Error).message }, 500);
  }
});
