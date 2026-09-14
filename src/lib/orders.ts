import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { NetId } from "@/components/app/networks";
import { getLang } from "@/lib/i18n";

type DbNetwork = Database["public"]["Enums"]["usdt_network"];
type DbSide = Database["public"]["Enums"]["order_side"];
type DbStatus = Database["public"]["Enums"]["order_status"];
export type OrderRow = Database["public"]["Tables"]["orders"]["Row"];

/** Correspondance réseau : identifiants front ↔ enum base. */
export const NET_TO_DB: Record<NetId, DbNetwork> = {
  trx: "trc20", bnb: "bep20", eth: "erc20", matic: "polygon", sol: "spl", avax: "avalanche",
};
export const DB_TO_NET: Record<DbNetwork, NetId> = {
  trc20: "trx", bep20: "bnb", erc20: "eth", polygon: "matic", spl: "sol", avalanche: "avax",
};

const ORDER_STATUS_I18N: Record<DbStatus, { fr: string; en: string }> = {
  created: { fr: "En attente de paiement", en: "Awaiting payment" },
  awaiting_payment: { fr: "En attente de paiement", en: "Awaiting payment" },
  payment_received: { fr: "Paiement reçu", en: "Payment received" },
  settling: { fr: "En traitement", en: "Processing" },
  completed: { fr: "Terminée", en: "Completed" },
  cancelled: { fr: "Annulée", en: "Cancelled" },
  expired: { fr: "Expirée", en: "Expired" },
};

export function orderStatusLabel(s: DbStatus): string {
  return ORDER_STATUS_I18N[s][getLang()];
}

/** Statut « en cours » (non finalisé) pour l'affichage. */
export const isOrderOpen = (s: DbStatus) => !["completed", "cancelled", "expired"].includes(s);

/** Référence courte lisible à partir de l'UUID. */
export const orderRef = (id: string) => `OOB-${id.slice(0, 8).toUpperCase()}`;

const round2 = (n: number) => Math.round(n * 100) / 100;
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

export interface CreateOrderInput {
  side: DbSide;
  cad: number;
  usdt: number;
  rate: number;
  network?: NetId;        // achat : réseau de réception
  address?: string;       // achat : adresse wallet du client
  interacEmail?: string;  // vente : e-mail Interac du client
}

/** Crée un ordre pour l'utilisateur connecté. Renvoie l'id ou une erreur. */
export async function createOrder(input: CreateOrderInput): Promise<{ id: string } | { error: string }> {
  const { TRADING_ENABLED } = await import("@/lib/config");
  if (!TRADING_ENABLED) {
    return {
      error: getLang() === "en"
        ? "Trading is temporarily suspended. Account creation and verification remain available."
        : "Les transactions sont temporairement suspendues. La création de compte et la vérification restent disponibles.",
    };
  }

  const { data: auth } = await supabase.auth.getSession();
  const uid = auth.session?.user?.id;
  if (!uid) return { error: getLang() === "en" ? "You must be logged in." : "Vous devez être connecté." };

  const rateLockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  // Vente : l'adresse de dépôt Ooble sera générée côté serveur plus tard.
  const walletAddress = input.side === "buy" ? (input.address ?? "") : "à générer";

  const { data, error } = await supabase
    .from("orders")
    .insert({
      user_id: uid,
      side: input.side,
      cad_amount: round2(input.cad),
      usdt_amount: round6(input.usdt),
      locked_rate: round6(input.rate),
      network: input.network ? NET_TO_DB[input.network] : "trc20",
      wallet_address: walletAddress,
      interac_email: input.side === "sell" ? (input.interacEmail ?? null) : null,
      status: "created",
      rate_locked_until: rateLockedUntil,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { id: data.id };
}

/**
 * Ordres de l'utilisateur connecté.
 *
 * Sécurité : on filtre EXPLICITEMENT par `user_id` en plus des politiques RLS.
 * La table `orders` porte deux politiques SELECT (utilisateur = ses ordres,
 * staff = tous les ordres) qui s'additionnent. Sans ce filtre, un compte
 * marqué staff verrait ici l'historique de tous les clients — c'est
 * exactement le bug qu'on ferme. Le filtre côté client garantit qu'aucun
 * autre chemin ne peut ramener plus que « les ordres du user connecté ».
 */
export async function listMyOrders(limit = 20): Promise<OrderRow[]> {
  const { data: auth } = await supabase.auth.getSession();
  const uid = auth.session?.user?.id;
  if (!uid) return [];

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return data ?? [];
}
