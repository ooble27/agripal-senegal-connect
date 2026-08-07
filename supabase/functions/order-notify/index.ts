// Edge function Ooble — notifie le client quand le statut d'un ordre change.
//
// Appelée par un Database Webhook Supabase configuré sur UPDATE de `orders`.
// Envoie une notification push + un e-mail au client.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const STATUS_FR: Record<string, string> = {
  created: "Créée",
  awaiting_payment: "En attente de paiement",
  payment_received: "Paiement reçu",
  settling: "En traitement",
  completed: "Terminée",
  cancelled: "Annulée",
  expired: "Expirée",
};

const STATUS_EN: Record<string, string> = {
  created: "Created",
  awaiting_payment: "Awaiting payment",
  payment_received: "Payment received",
  settling: "Processing",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "Config manquante" }, 500);

  let payload: { type: string; table: string; record: Record<string, unknown>; old_record: Record<string, unknown> };
  try { payload = await req.json(); }
  catch { return json({ error: "JSON invalide" }, 400); }

  if (payload.type !== "UPDATE" || payload.table !== "orders") {
    return json({ ok: true, skipped: true });
  }

  const oldStatus = payload.old_record?.status as string;
  const newStatus = payload.record?.status as string;
  if (!oldStatus || !newStatus || oldStatus === newStatus) {
    return json({ ok: true, skipped: "same_status" });
  }

  const userId = payload.record.user_id as string;
  const orderId = payload.record.id as string;
  const side = payload.record.side as string;
  const cadAmount = payload.record.cad_amount as number;
  const usdtAmount = payload.record.usdt_amount as number;
  const ref = `OOB-${orderId.slice(0, 8).toUpperCase()}`;

  const sideLabel = side === "buy" ? "Achat" : "Vente";
  const statusLabel = STATUS_FR[newStatus] ?? newStatus;
  const title = `${sideLabel} ${ref}`;
  const body = `Statut : ${statusLabel} — ${usdtAmount} USDT / ${cadAmount} $ CAD`;

  const admin = createClient(supabaseUrl, serviceKey);

  // Envoyer la notification push via push-notify
  try {
    await fetch(`${supabaseUrl}/functions/v1/push-notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        user_id: userId,
        title,
        body,
        url: `/app/activity`,
      }),
    });
  } catch (e) {
    console.error("order-notify: push failed", e);
  }

  // Envoyer un e-mail via send-email
  const { data: profile } = await admin
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.email) {
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          mode: "custom",
          to: profile.email,
          subject: `${title} — ${statusLabel}`,
          html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="margin:0 0 12px;font-size:18px">Mise à jour de votre transaction</h2>
            <p style="margin:0 0 8px"><strong>Réf :</strong> ${ref}</p>
            <p style="margin:0 0 8px"><strong>Type :</strong> ${sideLabel}</p>
            <p style="margin:0 0 8px"><strong>Montant :</strong> ${usdtAmount} USDT / ${cadAmount} $ CAD</p>
            <p style="margin:0 0 16px"><strong>Nouveau statut :</strong> ${statusLabel}</p>
            <a href="https://ooble.ca/app/activity" style="display:inline-block;padding:10px 20px;background:#0F3A43;color:#fff;text-decoration:none;border-radius:6px">Voir ma transaction</a>
            <p style="margin:16px 0 0;font-size:12px;color:#888">Ooble — ooble.ca</p>
          </div>`,
          text: `${title}\nStatut : ${statusLabel}\n${usdtAmount} USDT / ${cadAmount} $ CAD\n\nVoir : https://ooble.ca/app/activity`,
        }),
      });
    } catch (e) {
      console.error("order-notify: email failed", e);
    }
  }

  return json({ ok: true, ref, newStatus });
});
