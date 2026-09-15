// Edge function Ooble — notification PUSH uniquement quand le statut
// d'un ordre change (pas d'e-mail, ceux-ci sont gérés par le frontend).
//
// Appelée par le trigger Postgres `trg_order_status_notify` via pg_net.

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

  // NOTE : on n'envoie PAS d'e-mail ici. Les e-mails transactionnels
  // (order-buy, payment-received, order-completed…) sont déjà envoyés
  // par le frontend au bon moment. Envoyer un mail à chaque changement
  // de statut ferait des doublons.

  return json({ ok: true, ref, newStatus });
});
