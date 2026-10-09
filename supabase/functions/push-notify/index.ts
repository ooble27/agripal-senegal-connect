// Edge function Ooble — envoi de notifications push Web Push.
//
// Appelée par un webhook Supabase Database (pg_notify → webhook) ou
// directement par le back-office pour notifier un utilisateur.
//
// Payload attendu :
//   { user_id, title, body, url? }
//   ou, pour un message dans la langue de chaque appareil :
//   { user_id, i18n: { fr: { title, body }, en: { title, body } }, url? }
//
// Secrets requis :
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto Supabase)
//   VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWebPush } from "./webpush.ts";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:support@ooble.ca";

  if (!supabaseUrl || !serviceKey || !vapidPublic || !vapidPrivate) {
    return json({ error: "Config manquante" }, 500);
  }

  // Appel interne uniquement (order-notify, autres fonctions) : sans ce
  // contrôle, n'importe qui pourrait envoyer une notification et un lien
  // de son choix à n'importe quel client.
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (token !== serviceKey) return json({ error: "Non autorisé" }, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return json({ error: "JSON invalide" }, 400); }

  const userId = body.user_id as string;
  const url = (body.url as string) ?? "/app";
  const i18n = body.i18n as Record<string, { title: string; body: string }> | undefined;
  const plain = { title: (body.title as string) ?? "Ooble", body: (body.body as string) ?? "" };

  if (!userId) return json({ error: "user_id requis" }, 400);

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, lang")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) return json({ ok: true, sent: 0 });

  let sent = 0;
  const stale: string[] = [];
  const failures: { status: number; text?: string }[] = [];

  for (const sub of subs) {
    const m = i18n?.[sub.lang === "en" ? "en" : "fr"] ?? i18n?.fr ?? plain;
    const payload = JSON.stringify({ title: m.title, body: m.body, url });
    try {
      const result = await sendWebPush(sub, payload, { publicKey: vapidPublic, privateKey: vapidPrivate, subject: vapidSubject });
      if (result.ok) {
        sent++;
      } else if (result.status === 404 || result.status === 410) {
        stale.push(sub.endpoint);
      } else {
        failures.push({ status: result.status, text: result.text });
        console.error("push-notify: refus du service push", result.status, result.text);
      }
    } catch (e) {
      console.error("push-notify: erreur envoi", e);
      failures.push({ status: 0, text: (e as Error).message });
    }
  }

  if (stale.length > 0) {
    await admin.from("push_subscriptions").delete().in("endpoint", stale);
  }

  return json({ ok: true, sent, cleaned: stale.length, failures });
});
