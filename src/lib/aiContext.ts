import { supabase } from "@/integrations/supabase/client";
import { orderRef } from "@/lib/orders";
import type { PlatformContext } from "@/lib/ai";

const DB_STATUS_LABEL: Record<string, string> = {
  created: "Créée",
  awaiting_payment: "En attente",
  payment_received: "À traiter",
  settling: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
  expired: "Expirée",
  refunded: "Remboursée",
};

export async function fetchPlatformContext(): Promise<PlatformContext> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  const [ordersRes, kycRes, mailRes, rateRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id, side, status, cad_amount, usdt_amount, created_at, profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("kyc_verifications")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("mail_threads")
      .select("id", { count: "exact", head: true })
      .eq("has_unread", true),
    supabase
      .from("exchange_rates")
      .select("buy_rate, sell_rate")
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const orders = (ordersRes.data ?? []) as Array<{
    id: string;
    side: string;
    status: string;
    cad_amount: number;
    usdt_amount: number;
    created_at: string;
    profiles: { full_name: string | null } | null;
  }>;

  let pendingOrders = 0;
  let inProgressOrders = 0;
  let completedToday = 0;
  let cancelledToday = 0;
  let volumeCadToday = 0;
  const alerts: string[] = [];

  for (const o of orders) {
    const isToday = o.created_at >= todayIso;
    if (o.status === "awaiting_payment" || o.status === "created") pendingOrders++;
    if (o.status === "payment_received" || o.status === "settling") inProgressOrders++;
    if (o.status === "completed" && isToday) {
      completedToday++;
      volumeCadToday += Number(o.cad_amount);
    }
    if ((o.status === "cancelled" || o.status === "expired") && isToday) cancelledToday++;
  }

  if (pendingOrders > 5) alerts.push(`${pendingOrders} commandes en attente — possible engorgement.`);
  if (inProgressOrders > 3) alerts.push(`${inProgressOrders} commandes en traitement simultané.`);

  const pendingKyc = kycRes.count ?? 0;
  if (pendingKyc > 5) alerts.push(`${pendingKyc} KYC en attente de vérification.`);

  const unreadMessages = mailRes.count ?? 0;
  if (unreadMessages > 3) alerts.push(`${unreadMessages} messages non lus.`);

  const currentRate = rateRes.data?.buy_rate ? Number(rateRes.data.buy_rate) : null;

  const recentOrders = orders.slice(0, 20).map((o) => ({
    ref: orderRef(o.id),
    type: o.side,
    status: DB_STATUS_LABEL[o.status] ?? o.status,
    cadAmount: Number(o.cad_amount),
    usdtAmount: Number(o.usdt_amount),
    client: o.profiles?.full_name?.trim() || "Client",
    createdAt: new Date(o.created_at).toLocaleString("fr-CA", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  return {
    pendingOrders,
    inProgressOrders,
    completedToday,
    cancelledToday,
    volumeCadToday,
    pendingKyc,
    unreadMessages,
    currentRate,
    recentOrders,
    alerts,
  };
}
