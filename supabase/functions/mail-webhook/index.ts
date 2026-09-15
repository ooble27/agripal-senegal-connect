// Fonction edge Ooble — webhook e-mails entrants (Resend Inbound).
//
// Reçoit les e-mails envoyés à `support@ooble.ca` et les insère dans
// la table `mail_messages`, rattachés au bon thread. Le thread est
// identifié par le plus-addressing de l'adresse de destination :
//
//   support+t.{threadId}@ooble.ca  →  rattaché au thread existant
//   support@ooble.ca (sans +t.)    →  nouveau thread créé automatiquement
//
// Le webhook Resend Inbound n'envoie souvent QUE les métadonnées de l'email
// (from, to, subject, id). Pour obtenir le contenu (text/html), on fait un
// GET https://api.resend.com/emails/received/:id avec la clé API.
//
// Cette fonction est déployée SANS vérification JWT (--no-verify-jwt)
// car Resend l'appelle directement sans authentification Supabase.
//
// Secrets requis :
//   SUPABASE_URL              (auto Supabase)
//   SUPABASE_SERVICE_ROLE_KEY (auto Supabase)
//   RESEND_API_KEY            requis pour récupérer le corps des mails
//   MAIL_WEBHOOK_SECRET       (optionnel) signature Resend

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function extractEmail(raw: string): string {
  const match = /<([^>]+)>/.exec(raw);
  return (match ? match[1] : raw).trim().toLowerCase();
}

function extractName(raw: string): string {
  const match = /^"?([^"<]+)"?\s*</.exec(raw);
  return match ? match[1].trim() : "";
}

function cleanSubject(s: string): string {
  return s.replace(/^(Re|Fwd|Tr|Fw)\s*:\s*/gi, "").trim() || s;
}

// Récupère le contenu complet d'un email reçu via l'API Resend.
// Le webhook Resend Inbound n'envoie QUE les métadonnées, il faut appeler
// l'API pour obtenir text/html/attachments.
// Endpoint : https://api.resend.com/emails/receiving/:id
async function fetchResendEmail(id: string, apiKey: string): Promise<{
  text: string;
  html: string;
  subject: string;
  from: string;
  to: string[];
} | null> {
  // On essaie plusieurs endpoints (l'API a évolué au fil du temps) et
  // on prend le premier qui répond 200.
  const urls = [
    `https://api.resend.com/emails/receiving/${id}`,
    `https://api.resend.com/emails/received/${id}`,
    `https://api.resend.com/received-emails/${id}`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        console.warn(`fetchResendEmail: ${url} → HTTP ${res.status}`, errText.slice(0, 200));
        continue;
      }
      const email = await res.json();
      const d = (email.data ?? email) as Record<string, unknown>;
      console.log(`fetchResendEmail: succès sur ${url}, keys:`, Object.keys(d));
      return {
        text: (d.text as string) || "",
        html: (d.html as string) || "",
        subject: (d.subject as string) || "",
        from: (d.from as string) || "",
        to: Array.isArray(d.to) ? (d.to as string[]) : [],
      };
    } catch (e) {
      console.warn(`fetchResendEmail: ${url} → erreur`, e);
    }
  }
  console.error(`fetchResendEmail: aucun endpoint ne répond pour id=${id}`);
  return null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "Config manquante" }, 500);

  let payload: Record<string, unknown>;
  try { payload = await req.json(); }
  catch { return json({ error: "JSON invalide" }, 400); }

  console.log("mail-webhook: type =", payload.type);

  if (payload.type !== "email.received") {
    return json({ ok: true, skipped: `type=${payload.type}` });
  }

  const data = payload.data as Record<string, unknown> | undefined;
  if (!data) return json({ ok: true, skipped: "no_data" });

  const resendId = (data.email_id as string) ?? (data.id as string) ?? null;

  // ── Extraction des champs depuis le webhook ─────────────
  const fromField = data.from as unknown;
  let fromRaw = "";
  let fromNameFromObj = "";
  if (typeof fromField === "string") {
    fromRaw = fromField;
  } else if (Array.isArray(fromField) && fromField.length > 0) {
    const f = fromField[0] as { email?: string; name?: string };
    fromRaw = f?.email ?? "";
    fromNameFromObj = f?.name ?? "";
  } else if (fromField && typeof fromField === "object") {
    const f = fromField as { email?: string; name?: string };
    fromRaw = f?.email ?? "";
    fromNameFromObj = f?.name ?? "";
  }

  const toRaw = Array.isArray(data.to) ? data.to : [];
  const toAddresses: string[] = toRaw.map((x: unknown) => {
    if (typeof x === "string") return x;
    if (x && typeof x === "object") return (x as { email?: string }).email ?? "";
    return "";
  }).filter(Boolean);

  let subject = (data.subject as string) ?? "";
  let bodyText = (data.text as string) || "";
  let bodyHtml = (data.html as string) || "";

  // ── Fallback : le webhook n'a pas envoyé le corps, on va le
  //    chercher via l'API Resend (méthode recommandée par Resend
  //    pour les emails entrants).
  if (!bodyText && !bodyHtml && resendId && resendApiKey) {
    console.log("mail-webhook: body vide dans webhook, fetch API Resend pour", resendId);
    const full = await fetchResendEmail(resendId, resendApiKey);
    if (full) {
      bodyText = full.text || bodyText;
      bodyHtml = full.html || bodyHtml;
      subject = full.subject || subject;
      if (!fromRaw && full.from) fromRaw = full.from;
      if (toAddresses.length === 0 && full.to.length > 0) {
        toAddresses.push(...full.to);
      }
    }
  }

  const senderEmail = extractEmail(fromRaw);
  const senderName = extractName(fromRaw)
    || fromNameFromObj
    || ((data.from_name as string) ?? "");

  // Extraire l'ID du thread depuis le plus-addressing.
  let threadId: string | null = null;
  for (const addr of toAddresses) {
    const match = /^support\+t\.([a-f0-9-]{36})@/i.exec(extractEmail(addr));
    if (match) { threadId = match[1]; break; }
  }

  const admin = createClient(supabaseUrl, serviceKey);

  // ── Thread connu : insertion du message ─────────────────
  if (threadId) {
    const { data: thread } = await admin
      .from("mail_threads")
      .select("id")
      .eq("id", threadId)
      .maybeSingle();

    if (thread) {
      await admin.from("mail_messages").insert({
        thread_id: threadId,
        direction: "inbound",
        from_email: senderEmail,
        from_name: senderName || null,
        to_email: toAddresses[0] ?? "",
        subject,
        body_text: bodyText || null,
        body_html: bodyHtml || null,
        resend_id: resendId,
      });
      return json({ ok: true, threadId, action: "message_added" });
    }
  }

  // ── Nouveau thread ──────────────────────────────────────
  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("email", senderEmail)
    .maybeSingle();

  const { data: newThread, error: threadErr } = await admin
    .from("mail_threads")
    .insert({
      client_id: profile?.id ?? null,
      client_email: senderEmail,
      client_name: senderName || profile?.full_name || null,
      subject: cleanSubject(subject),
      last_message_at: new Date().toISOString(),
      has_unread: true,
    })
    .select("id")
    .single();

  if (threadErr || !newThread) {
    console.error("mail-webhook: erreur création thread", threadErr);
    return json({ error: "Échec création thread" }, 500);
  }

  await admin.from("mail_messages").insert({
    thread_id: newThread.id,
    direction: "inbound",
    from_email: senderEmail,
    from_name: senderName || null,
    to_email: toAddresses[0] ?? "",
    subject,
    body_text: bodyText || null,
    body_html: bodyHtml || null,
    resend_id: resendId,
  });

  return json({ ok: true, threadId: newThread.id, action: "thread_created" });
});
