/**
 * Ooble — Trésorerie USDT multi-réseaux.
 *
 * Helpers pour l'inventaire des adresses (dépôt, hot, cold, règlement),
 * les snapshots de solde manuels et les mouvements internes/externes.
 *
 * Les soldes on-chain seront rapatriés automatiquement dans une prochaine
 * itération (TronScan, Etherscan, BscScan, PolygonScan, Solscan, Snowtrace).
 * En attendant, tout est saisi manuellement — la colonne `source` sur les
 * snapshots distingue déjà 'manual' de 'onchain_api' pour préparer le futur.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { NetId } from "@/components/app/networks";
import { DB_TO_NET, NET_TO_DB } from "@/lib/orders";

/**
 * Les types Supabase générés (`types.ts`) ne connaissent pas encore les tables
 * de trésorerie ; on décrit ici la forme des lignes et on caste `supabase as any`
 * pour les appels — inoffensif car les policies RLS restent l'autorité.
 */
type DbNetwork = Database["public"]["Enums"]["usdt_network"];
export type TreasuryPurpose = "deposit" | "hot" | "cold" | "settlement";

export interface TreasuryAddressRow {
  id: string;
  network: DbNetwork;
  label: string;
  address: string;
  purpose: TreasuryPurpose;
  active: boolean;
  created_at: string;
}

export interface TreasurySnapshotRow {
  id: string;
  address_id: string;
  balance_usdt: string | number;
  recorded_at: string;
  source: string;
  recorded_by: string | null;
}

export interface TreasuryMovementRow {
  id: string;
  from_address_id: string | null;
  to_address_id: string | null;
  amount_usdt: string | number;
  tx_hash: string | null;
  reason: string;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
}

export interface TreasuryAlertConfigRow {
  network: DbNetwork;
  low_balance_threshold_usdt: string | number;
  alert_enabled: boolean;
  updated_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

/** Adresse enrichie du dernier solde connu. */
export interface TreasuryAddressWithBalance {
  id: string;
  network: NetId;
  label: string;
  address: string;
  purpose: TreasuryPurpose;
  active: boolean;
  createdAt: string;
  latestBalance: number | null;
  latestRecordedAt: string | null;
  latestSource: string | null;
}

export interface TreasuryAlertConfig {
  network: NetId;
  lowBalanceThresholdUsdt: number;
  alertEnabled: boolean;
  updatedAt: string;
}

export interface LowBalanceAlert {
  addressId: string;
  network: NetId;
  label: string;
  address: string;
  balance: number;
  threshold: number;
  purpose: TreasuryPurpose;
}

export interface ExpectedOutflows {
  /** Total USDT dûs aux clients pour les achats non terminés, par réseau. */
  byNetwork: Record<NetId, number>;
  total: number;
  openBuyOrders: number;
}

/** Motifs de mouvement (texte libre en base, mais on suggère ces 4 valeurs). */
export const MOVEMENT_REASONS = ["rebalancing", "liquidation", "topup", "other"] as const;
export type MovementReason = (typeof MOVEMENT_REASONS)[number];

/** Libellés bilingues des rôles d'adresse. */
export const PURPOSE_LABEL: Record<TreasuryPurpose, { fr: string; en: string }> = {
  deposit:    { fr: "Dépôt client",  en: "Client deposit" },
  hot:        { fr: "Hot wallet",    en: "Hot wallet" },
  cold:       { fr: "Cold storage",  en: "Cold storage" },
  settlement: { fr: "Règlement",     en: "Settlement" },
};

/** Libellés bilingues des motifs de mouvement. */
export const REASON_LABEL: Record<MovementReason, { fr: string; en: string }> = {
  rebalancing: { fr: "Rééquilibrage", en: "Rebalancing" },
  liquidation: { fr: "Liquidation",   en: "Liquidation" },
  topup:       { fr: "Approvisionnement", en: "Top-up" },
  other:       { fr: "Autre",         en: "Other" },
};

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

// ──────────────── Adresses ────────────────

/** Toutes les adresses de trésorerie + leur dernier snapshot connu. */
export async function listAddresses(): Promise<TreasuryAddressWithBalance[]> {
  const { data: addrs, error } = await sb
    .from("treasury_addresses")
    .select("*")
    .order("created_at", { ascending: true });
  if (error || !addrs) return [];

  const balances = await getLatestBalances();
  const bMap = new Map(balances.map((b) => [b.address_id, b]));

  return addrs.map((a) => {
    const b = bMap.get(a.id);
    return {
      id: a.id,
      network: DB_TO_NET[a.network],
      label: a.label,
      address: a.address,
      purpose: a.purpose,
      active: a.active,
      createdAt: a.created_at,
      latestBalance: b ? Number(b.balance_usdt) : null,
      latestRecordedAt: b ? b.recorded_at : null,
      latestSource: b ? b.source : null,
    };
  });
}

export interface SaveAddressInput {
  id?: string;
  network: NetId;
  label: string;
  address: string;
  purpose: TreasuryPurpose;
  active?: boolean;
}

/** Crée ou met à jour une adresse de trésorerie. */
export async function saveAddress(input: SaveAddressInput): Promise<{ id: string } | { error: string }> {
  const payload = {
    network: NET_TO_DB[input.network],
    label: input.label.trim(),
    address: input.address.trim(),
    purpose: input.purpose,
    active: input.active ?? true,
  };
  if (input.id) {
    const { data, error } = await sb
      .from("treasury_addresses")
      .update(payload)
      .eq("id", input.id)
      .select("id")
      .single();
    if (error) return { error: error.message };
    return { id: data.id };
  }
  const { data, error } = await sb
    .from("treasury_addresses")
    .insert(payload)
    .select("id")
    .single();
  if (error) return { error: error.message };
  return { id: data.id };
}

// ──────────────── Snapshots de solde ────────────────

/**
 * Renvoie le snapshot le plus récent pour chaque adresse.
 * (On lit toute la table côté client puis on dédoublonne par adresse : simple
 * et suffisant tant que le volume reste bas — quelques dizaines d'adresses.)
 */
export async function getLatestBalances(): Promise<TreasurySnapshotRow[]> {
  const { data, error } = await sb
    .from("treasury_balance_snapshots")
    .select("*")
    .order("recorded_at", { ascending: false });
  if (error || !data) return [];
  const seen = new Set<string>();
  const latest: TreasurySnapshotRow[] = [];
  for (const row of data) {
    if (seen.has(row.address_id)) continue;
    seen.add(row.address_id);
    latest.push(row);
  }
  return latest;
}

export interface RecordSnapshotInput {
  addressId: string;
  balanceUsdt: number;
  source?: string; // 'manual' par défaut
}

/** Enregistre un snapshot manuel du solde. */
export async function recordSnapshot(input: RecordSnapshotInput): Promise<{ id: string } | { error: string }> {
  const { data: auth } = await supabase.auth.getSession();
  const uid = auth.session?.user?.id ?? null;
  const { data, error } = await sb
    .from("treasury_balance_snapshots")
    .insert({
      address_id: input.addressId,
      balance_usdt: round6(input.balanceUsdt),
      source: input.source ?? "manual",
      recorded_by: uid,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  return { id: data.id };
}

// ──────────────── Mouvements ────────────────

export interface RecordMovementInput {
  fromAddressId?: string | null;
  toAddressId?: string | null;
  amountUsdt: number;
  txHash?: string | null;
  reason: string;
  notes?: string | null;
}

/** Enregistre un mouvement (rééquilibrage, liquidation, approvisionnement…). */
export async function recordMovement(input: RecordMovementInput): Promise<{ id: string } | { error: string }> {
  const { data: auth } = await supabase.auth.getSession();
  const uid = auth.session?.user?.id ?? null;
  if (!input.fromAddressId && !input.toAddressId) {
    return { error: "Un mouvement doit avoir au moins une extrémité (source ou destination)." };
  }
  const { data, error } = await sb
    .from("treasury_movements")
    .insert({
      from_address_id: input.fromAddressId ?? null,
      to_address_id: input.toAddressId ?? null,
      amount_usdt: round6(input.amountUsdt),
      tx_hash: input.txHash?.trim() || null,
      reason: input.reason || "other",
      notes: input.notes?.trim() || null,
      recorded_by: uid,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  return { id: data.id };
}

/** Les N derniers mouvements. */
export async function listMovements(limit = 20): Promise<TreasuryMovementRow[]> {
  const { data, error } = await sb
    .from("treasury_movements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data;
}

// ──────────────── Configuration d'alerte ────────────────

export async function getAlertConfig(): Promise<TreasuryAlertConfig[]> {
  const { data, error } = await sb
    .from("treasury_alert_config")
    .select("*");
  if (error || !data) return [];
  return data.map((r) => ({
    network: DB_TO_NET[r.network],
    lowBalanceThresholdUsdt: Number(r.low_balance_threshold_usdt),
    alertEnabled: r.alert_enabled,
    updatedAt: r.updated_at,
  }));
}

export async function saveAlertConfig(
  network: NetId,
  thresholdUsdt: number,
  enabled: boolean,
): Promise<{ ok: true } | { error: string }> {
  const db = NET_TO_DB[network];
  const { error } = await sb
    .from("treasury_alert_config")
    .upsert(
      {
        network: db,
        low_balance_threshold_usdt: round6(thresholdUsdt),
        alert_enabled: enabled,
      },
      { onConflict: "network" },
    );
  if (error) return { error: error.message };
  return { ok: true };
}

// ──────────────── Alertes solde bas ────────────────

/**
 * Adresses dont le dernier solde connu est sous le seuil de leur réseau,
 * uniquement pour les réseaux dont les alertes sont activées.
 */
export async function getLowBalanceAlerts(): Promise<LowBalanceAlert[]> {
  const [addresses, configs] = await Promise.all([listAddresses(), getAlertConfig()]);
  const cMap = new Map(configs.map((c) => [c.network, c] as const));

  const alerts: LowBalanceAlert[] = [];
  for (const a of addresses) {
    if (!a.active) continue;
    const cfg = cMap.get(a.network);
    if (!cfg || !cfg.alertEnabled) continue;
    if (a.latestBalance == null) continue;
    if (a.latestBalance < cfg.lowBalanceThresholdUsdt) {
      alerts.push({
        addressId: a.id,
        network: a.network,
        label: a.label,
        address: a.address,
        balance: a.latestBalance,
        threshold: cfg.lowBalanceThresholdUsdt,
        purpose: a.purpose,
      });
    }
  }
  return alerts;
}

// ──────────────── Réconciliation ────────────────

const OPEN_STATUSES: DbNetwork extends never ? never : Array<Database["public"]["Enums"]["order_status"]> = [
  "created",
  "awaiting_payment",
  "payment_received",
  "settling",
];

/**
 * Somme des USDT à envoyer aux clients pour les achats non finalisés
 * (payment_received / settling : engagements fermes ; created / awaiting_payment
 * inclus car nous devons pouvoir couvrir la commande dès qu'elle passe en
 * `payment_received`).
 */
export async function getExpectedOutflows(): Promise<ExpectedOutflows> {
  const { data, error } = await supabase
    .from("orders")
    .select("network, usdt_amount, status")
    .eq("side", "buy")
    .in("status", OPEN_STATUSES);

  const byNetwork: Record<NetId, number> = {
    trx: 0, bnb: 0, eth: 0, matic: 0, sol: 0, avax: 0,
  };
  if (error || !data) return { byNetwork, total: 0, openBuyOrders: 0 };

  let total = 0;
  for (const row of data) {
    const net = DB_TO_NET[row.network];
    const amt = Number(row.usdt_amount) || 0;
    byNetwork[net] += amt;
    total += amt;
  }
  return { byNetwork, total, openBuyOrders: data.length };
}
