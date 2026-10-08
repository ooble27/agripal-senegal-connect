/**
 * Règlement automatique des achats (admin) : avis Interac lus sur
 * interac@ooble.ca, envois d'USDT depuis le portefeuille chaud et réglages.
 * Côté serveur : fonctions edge `mail-webhook` (avis) et `usdt-payout` (envois).
 */
import { supabase } from "@/integrations/supabase/client";

// Tables récentes, absentes des types générés.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (t: string) => any };

export interface SettlementSettings {
  auto_payout: boolean;
  auto_payout_max_cad: number;
  daily_payout_max_usdt: number;
  require_email_auth: boolean;
  updated_at: string;
}

export interface WalletState {
  network: string;
  label: string;
  configured: boolean;
  address?: string | null;
  usdt?: number;
  gas?: number;
  gasSymbol?: string;
  minGas?: number;
  error?: string;
}

export interface InteracReceipt {
  id: string;
  received_at: string;
  sender_name: string | null;
  amount_cad: number | null;
  order_ref: string | null;
  order_id: string | null;
  interac_ref: string | null;
  status: "matched" | "unmatched" | "mismatch" | "duplicate" | "ignored";
  reason: string | null;
  authenticated: boolean;
  subject: string | null;
  body_text: string | null;
}

export interface UsdtPayout {
  id: string;
  order_id: string;
  network: string;
  to_address: string;
  usdt_amount: number;
  status: "sending" | "broadcast" | "confirmed" | "failed" | "review";
  tx_hash: string | null;
  error: string | null;
  trigger: "auto" | "staff";
  created_at: string;
}

export interface PayoutResult { ok: boolean; status?: string; hash?: string; url?: string; error?: string; review?: boolean }

const EXPLORER: Record<string, string> = {
  trc20: "https://tronscan.org/#/transaction/",
  bep20: "https://bscscan.com/tx/",
  polygon: "https://polygonscan.com/tx/",
  avalanche: "https://snowtrace.io/tx/",
  erc20: "https://etherscan.io/tx/",
};
export const txUrl = (network: string, hash: string) => (EXPLORER[network] ? EXPLORER[network] + hash : "");

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("usdt-payout", { body });
  if (error) return { ok: false, error: error.message } as T;
  return data as T;
}

export const sendPayout = (orderId: string) => invoke<PayoutResult>({ action: "send", order_id: orderId });
export const fetchWallets = () => invoke<{ ok: boolean; settings?: SettlementSettings; wallets?: WalletState[]; error?: string }>({ action: "status" });
export const reconcilePayouts = () => invoke<{ ok: boolean }>({ action: "reconcile" });

export async function updateSettings(patch: Partial<SettlementSettings>): Promise<{ error?: string }> {
  const { data: auth } = await supabase.auth.getSession();
  const { error } = await db.from("settlement_settings")
    .update({ ...patch, updated_at: new Date().toISOString(), updated_by: auth.session?.user?.id ?? null })
    .eq("id", 1);
  return error ? { error: error.message } : {};
}

export async function fetchReceipts(limit = 30): Promise<InteracReceipt[]> {
  const { data } = await db.from("interac_receipts").select("*").order("received_at", { ascending: false }).limit(limit);
  return (data ?? []) as InteracReceipt[];
}

export async function fetchPayouts(orderId?: string, limit = 30): Promise<UsdtPayout[]> {
  let q = db.from("usdt_payouts").select("*").order("created_at", { ascending: false }).limit(limit);
  if (orderId) q = q.eq("order_id", orderId);
  const { data } = await q;
  return (data ?? []) as UsdtPayout[];
}
