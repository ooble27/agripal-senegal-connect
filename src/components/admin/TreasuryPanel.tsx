import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Plus, ChevronDown, AlertTriangle, Save, ArrowRightLeft,
  Wallet, TrendingDown, RefreshCw, Layers, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { T } from "@/lib/i18n";
import { NETWORKS, type NetId } from "@/components/app/networks";
import { NetworkCoin } from "@/components/illustrations";
import { nfUsdt, type AdminOrder } from "@/lib/adminOrders";
import { C, FONT, numeric } from "./adminTheme";
import AdminHero from "./AdminHero";
import {
  listAddresses, saveAddress, recordSnapshot, recordMovement,
  getAlertConfig, saveAlertConfig, getLowBalanceAlerts, getExpectedOutflows,
  PURPOSE_LABEL, REASON_LABEL, MOVEMENT_REASONS,
  type TreasuryAddressWithBalance, type TreasuryAlertConfig, type TreasuryPurpose,
  type MovementReason, type LowBalanceAlert, type ExpectedOutflows,
} from "@/lib/treasury";
import { SubTabs } from "./AdminBits";

// ──────────────── Design tokens ────────────────

const inputCn =
  "w-full rounded-xl border border-border bg-card px-4 py-3 text-[14px] leading-tight outline-none ring-offset-background transition-colors placeholder:text-muted-foreground/50 focus:border-foreground focus:ring-2 focus:ring-foreground/10";

// ──────────────── Shared bits ────────────────

const BackButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-secondary active:scale-95"
    aria-label="Retour"
  >
    <ArrowLeft className="h-[18px] w-[18px]" />
  </button>
);

const Field = ({ label, hint, required, children }: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode;
}) => (
  <div>
    <label className="mb-1.5 flex items-baseline justify-between gap-2">
      <span className="text-[12px] font-medium">
        {label}{required && <span className="ml-0.5 text-destructive">*</span>}
      </span>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </label>
    {children}
  </div>
);

const SelectWrap = ({ children }: { children: React.ReactNode }) => (
  <div className="relative">
    {children}
    <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
  </div>
);

const SummaryCard = ({ label, value, sub, urgent, icon: Icon }: {
  label: string; value: string; sub?: string; urgent?: boolean;
  icon?: typeof Wallet;
}) => (
  <div className={cn("rounded-2xl border bg-card px-5 py-4", urgent ? "border-destructive/30" : "border-border")}>
    <div className="flex items-center justify-between">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      {Icon && <Icon className={cn("h-4 w-4", urgent ? "text-destructive" : "text-muted-foreground/60")} strokeWidth={1.8} />}
    </div>
    <p className={cn(
      "mt-1.5 font-display text-[24px] font-light leading-none tracking-tight tabular-nums",
      urgent && "text-destructive",
    )}>{value}</p>
    {sub && <p className="mt-1.5 text-[12px] text-muted-foreground">{sub}</p>}
  </div>
);

const SuccessBanner = ({ message }: { message: string }) => (
  <div className="flex items-center gap-2.5 rounded-xl border border-foreground/10 bg-foreground/5 px-4 py-3">
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
      <Check className="h-3 w-3" strokeWidth={3} />
    </span>
    <p className="text-[13px] font-medium">{message}</p>
  </div>
);

const ErrorBanner = ({ message }: { message: string }) => (
  <div className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
    <p className="text-[13px] text-destructive">{message}</p>
  </div>
);

const truncMid = (s: string, keep = 8) =>
  s.length <= keep * 2 + 3 ? s : `${s.slice(0, keep)}…${s.slice(-keep)}`;

const purposeLabel = (p: TreasuryPurpose, lang: "fr" | "en" = "fr") => PURPOSE_LABEL[p][lang];

// ──────────────── Overview + address list ────────────────

const OverviewView = ({
  addresses, configs, alerts, outflows,
  onAdd, onEdit, onSnapshot,
}: {
  addresses: TreasuryAddressWithBalance[];
  configs: TreasuryAlertConfig[];
  alerts: LowBalanceAlert[];
  outflows: ExpectedOutflows;
  onAdd: () => void;
  onEdit: (id: string) => void;
  onSnapshot: (id: string) => void;
}) => {
  const totals = useMemo(() => {
    const byNet: Record<NetId, number> = { trx: 0, bnb: 0, eth: 0, matic: 0, sol: 0, avax: 0 };
    const addrCount: Record<NetId, number> = { trx: 0, bnb: 0, eth: 0, matic: 0, sol: 0, avax: 0 };
    let grand = 0;
    for (const a of addresses) {
      if (!a.active) continue;
      addrCount[a.network] += 1;
      if (a.latestBalance != null) {
        byNet[a.network] += a.latestBalance;
        grand += a.latestBalance;
      }
    }
    return { byNet, addrCount, grand };
  }, [addresses]);

  const cMap = new Map(configs.map((c) => [c.network, c] as const));

  return (
    <div className="space-y-5" style={{ fontFamily: FONT, color: C.t1 }}>
      {/* Héro — Trésorerie totale. Contenu dans une colonne pour ne pas
          s'étaler sur toute la largeur de la page. */}
      <div className="lg:max-w-[620px]">
        <AdminHero
          eyebrow={<T en="Total treasury">Trésorerie totale</T>}
          value={nfUsdt.format(totals.grand)}
          unit="USDT"
          stats={[
            {
              label: <T en="Addresses">Adresses</T>,
              value: addresses.filter((a) => a.active).length,
            },
            {
              label: <T en="Low balance">Solde bas</T>,
              value: alerts.length,
            },
            {
              label: <T en="Outflows">Sorties</T>,
              value: nfUsdt.format(outflows.total),
            },
            {
              label: <T en="Open buys">Achats ouverts</T>,
              value: outflows.openBuyOrders,
            },
          ]}
          actions={[
            {
              label: <T en="Add address">Ajouter une adresse</T>,
              icon: Plus,
              primary: true,
              onClick: onAdd,
            },
          ]}
        />
      </div>

      {/* Sous-totaux par réseau */}
      <div>
        <p className="mb-2.5 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          <T en="By network">Par réseau</T>
        </p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {NETWORKS.map((n) => {
            const bal = totals.byNet[n.id];
            const cfg = cMap.get(n.id);
            const under = cfg && cfg.alertEnabled && bal < cfg.lowBalanceThresholdUsdt;
            return (
              <div
                key={n.id}
                className={cn(
                  "flex flex-col items-center rounded-2xl border bg-card px-3 py-4 text-center",
                  under ? "border-destructive/30" : "border-border",
                )}
              >
                <NetworkCoin id={n.id} className="h-11 w-11" />
                <p className="mt-2.5 text-[12px] font-medium">{n.name}</p>
                <p className="text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">{n.tag}</p>
                <p className={cn("mt-2 font-display text-[16px] tabular-nums leading-none", under && "text-destructive")}>
                  {nfUsdt.format(bal)}
                </p>
                <p className="mt-0.5 text-[10.5px] text-muted-foreground">
                  {totals.addrCount[n.id]} <T en="addr.">adr.</T>
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bandeau alertes */}
      {alerts.length > 0 && (
        <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <p className="text-[13px] font-semibold text-destructive">
              <T en="Low balances detected">Soldes bas détectés</T>
            </p>
          </div>
          <ul className="space-y-1.5 pl-6 text-[12.5px] text-muted-foreground">
            {alerts.map((a) => (
              <li key={a.addressId} className="tabular-nums">
                {a.label} · <span className="font-mono text-[11.5px]">{truncMid(a.address, 6)}</span> ·{" "}
                <span className="font-semibold text-destructive">{nfUsdt.format(a.balance)} USDT</span>{" "}
                <span className="text-muted-foreground/70">(seuil {nfUsdt.format(a.threshold)})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Header + bouton ajout */}
      <div className="flex items-center justify-between gap-3">
        <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          <T en="Addresses">Adresses</T>
        </p>
        <Button
          variant="appSolid" shape="rounded"
          className="h-auto gap-1.5 rounded-xl px-4 py-2 text-[12.5px] font-bold"
          onClick={onAdd}
        >
          <Plus className="h-3.5 w-3.5" />
          <T en="Add address">Ajouter une adresse</T>
        </Button>
      </div>

      {/* Table des adresses */}
      {addresses.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-border bg-card py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
            <Wallet className="h-5 w-5" strokeWidth={1.6} />
          </span>
          <p className="mt-3 text-[13px] text-muted-foreground">
            <T en="No treasury address yet.">Aucune adresse de trésorerie pour l'instant.</T>
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="hidden grid-cols-[1.4fr_0.8fr_0.7fr_1fr_auto] items-center gap-3 border-b border-border px-4 py-2.5 md:grid">
            {["Adresse", "Réseau", "Rôle", "Solde", ""].map((h) => (
              <span key={h} className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                {h}
              </span>
            ))}
          </div>
          {addresses.map((a, i) => {
            const cfg = cMap.get(a.network);
            const under =
              cfg && cfg.alertEnabled && a.active && a.latestBalance != null &&
              a.latestBalance < cfg.lowBalanceThresholdUsdt;
            return (
              <div
                key={a.id}
                className={cn(
                  "grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 md:grid-cols-[1.4fr_0.8fr_0.7fr_1fr_auto]",
                  i < addresses.length - 1 && "border-b border-border",
                  !a.active && "opacity-60",
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <NetworkCoin id={a.network} className="h-5 w-5 shrink-0 md:hidden" />
                    <p className="truncate text-[13px] font-medium">{a.label}</p>
                  </div>
                  <p className="truncate font-mono text-[11.5px] text-muted-foreground">{truncMid(a.address, 10)}</p>
                  {/* Solde compact affiché sous l'adresse sur mobile uniquement */}
                  <div className="mt-1 flex items-center gap-2 md:hidden">
                    <span className="text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">
                      {purposeLabel(a.purpose)}
                    </span>
                    <span className="text-muted-foreground/40">·</span>
                    {a.latestBalance == null ? (
                      <span className="text-[11.5px] italic text-muted-foreground/70">
                        <T en="No snapshot">Aucun snapshot</T>
                      </span>
                    ) : (
                      <span className={cn("font-display text-[13px] tabular-nums", under && "text-destructive font-semibold")}>
                        {nfUsdt.format(a.latestBalance)} USDT
                      </span>
                    )}
                  </div>
                </div>
                <div className="hidden items-center gap-2 md:flex">
                  <NetworkCoin id={a.network} className="h-6 w-6" />
                  <span className="text-[12px] text-muted-foreground">
                    {NETWORKS.find((n) => n.id === a.network)?.tag}
                  </span>
                </div>
                <span className="hidden text-[12px] text-muted-foreground md:block">
                  {purposeLabel(a.purpose)}
                </span>
                <div className="hidden text-right md:block">
                  {a.latestBalance == null ? (
                    <span className="text-[12px] italic text-muted-foreground/70">
                      <T en="No snapshot">Aucun snapshot</T>
                    </span>
                  ) : (
                    <>
                      <p className={cn("font-display text-[15px] tabular-nums", under && "text-destructive font-semibold")}>
                        {nfUsdt.format(a.latestBalance)}
                      </p>
                      {a.latestRecordedAt && (
                        <p className="text-[10.5px] text-muted-foreground">
                          {new Date(a.latestRecordedAt).toLocaleDateString("fr-CA")}
                          {a.latestSource && a.latestSource !== "manual" && ` · ${a.latestSource}`}
                        </p>
                      )}
                    </>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    variant="appOutline" shape="rounded"
                    className="h-auto gap-1 rounded-[9px] px-2.5 py-[6px] text-[11.5px]"
                    onClick={() => onSnapshot(a.id)}
                    title="Enregistrer un solde"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span className="hidden md:inline"><T en="Snapshot">Snapshot</T></span>
                  </Button>
                  <Button
                    variant="appOutline" shape="rounded"
                    className="h-auto rounded-[9px] px-2.5 py-[6px] text-[11.5px]"
                    onClick={() => onEdit(a.id)}
                  >
                    <T en="Edit">Éditer</T>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ──────────────── Address form ────────────────

const AddressForm = ({ initial, onSubmit, onBack }: {
  initial: TreasuryAddressWithBalance | null;
  onSubmit: (values: {
    id?: string; network: NetId; label: string; address: string;
    purpose: TreasuryPurpose; active: boolean;
  }) => void;
  onBack: () => void;
}) => {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [network, setNetwork] = useState<NetId>(initial?.network ?? "trx");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [purpose, setPurpose] = useState<TreasuryPurpose>(initial?.purpose ?? "deposit");
  const [active, setActive] = useState(initial?.active ?? true);

  const valid = label.trim().length > 0 && address.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <BackButton onClick={onBack} />
        <div>
          <h3 className="font-display text-[17px] font-semibold tracking-tight">
            {initial ? <T en="Edit address">Modifier l'adresse</T> : <T en="New treasury address">Nouvelle adresse de trésorerie</T>}
          </h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            <T en="Register a wallet to track its USDT balance and movements.">
              Enregistrez un portefeuille pour suivre son solde USDT et ses mouvements.
            </T>
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <Field label="Label" required>
          <input
            type="text" value={label} onChange={(e) => setLabel(e.target.value)}
            placeholder="Hot deposit TRC20, Cold storage ERC20…" className={inputCn}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Réseau" required>
            <SelectWrap>
              <select
                value={network} onChange={(e) => setNetwork(e.target.value as NetId)}
                className={cn(inputCn, "appearance-none pr-10")}
              >
                {NETWORKS.map((n) => (
                  <option key={n.id} value={n.id}>{n.name} · {n.tag}</option>
                ))}
              </select>
            </SelectWrap>
          </Field>
          <Field label="Rôle" required>
            <SelectWrap>
              <select
                value={purpose} onChange={(e) => setPurpose(e.target.value as TreasuryPurpose)}
                className={cn(inputCn, "appearance-none pr-10")}
              >
                {(Object.keys(PURPOSE_LABEL) as TreasuryPurpose[]).map((p) => (
                  <option key={p} value={p}>{PURPOSE_LABEL[p].fr}</option>
                ))}
              </select>
            </SelectWrap>
          </Field>
        </div>

        <Field label="Adresse" required hint="Publique — pas de clé privée">
          <input
            type="text" value={address} onChange={(e) => setAddress(e.target.value)}
            placeholder="T…, 0x…, …" className={cn(inputCn, "font-mono text-[13px]")}
          />
        </Field>

        <label className="flex cursor-pointer items-center gap-2.5 pt-1">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 rounded border-border" />
          <span className="text-[13px]"><T en="Active (counted in totals & alerts)">Active (comptée dans les totaux & alertes)</T></span>
        </label>
      </div>

      <Button
        variant="appSolid" shape="rounded"
        className="h-auto w-full gap-2 rounded-xl px-5 py-3.5 text-[14px] font-bold"
        disabled={!valid}
        onClick={() => onSubmit({
          id: initial?.id, network, label: label.trim(),
          address: address.trim(), purpose, active,
        })}
      >
        <Save className="h-4 w-4" />
        {initial ? <T en="Save changes">Enregistrer les modifications</T> : <T en="Add address">Ajouter l'adresse</T>}
      </Button>
    </div>
  );
};

// ──────────────── Snapshot form ────────────────

const SnapshotForm = ({ address, onSubmit, onBack }: {
  address: TreasuryAddressWithBalance;
  onSubmit: (balance: number) => void;
  onBack: () => void;
}) => {
  const [balance, setBalance] = useState<string>(
    address.latestBalance != null ? String(address.latestBalance) : "",
  );
  const parsed = Number(balance);
  const valid = balance.length > 0 && !Number.isNaN(parsed) && parsed >= 0;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <BackButton onClick={onBack} />
        <div>
          <h3 className="font-display text-[17px] font-semibold tracking-tight">
            <T en="Record a balance snapshot">Enregistrer un snapshot de solde</T>
          </h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            <T en="Manual entry — on-chain fetch will replace this later.">
              Saisie manuelle — le rapatriement on-chain le remplacera plus tard.
            </T>
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <NetworkCoin id={address.network} className="h-9 w-9" />
          <div className="min-w-0">
            <p className="text-[13px] font-medium">{address.label}</p>
            <p className="truncate font-mono text-[11.5px] text-muted-foreground">{address.address}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <Field label="Solde USDT" required hint="Ex. 12345.67">
          <input
            type="text" inputMode="decimal" value={balance}
            onChange={(e) => setBalance(e.target.value.replace(",", "."))}
            className={cn(inputCn, "tabular-nums")}
          />
        </Field>
        {address.latestBalance != null && (
          <p className="mt-2 text-[11.5px] text-muted-foreground">
            <T en="Previous">Précédent</T> : <span className="tabular-nums">{nfUsdt.format(address.latestBalance)} USDT</span>
            {address.latestRecordedAt && ` · ${new Date(address.latestRecordedAt).toLocaleString("fr-CA")}`}
          </p>
        )}
      </div>

      <Button
        variant="appSolid" shape="rounded"
        className="h-auto w-full gap-2 rounded-xl px-5 py-3.5 text-[14px] font-bold"
        disabled={!valid}
        onClick={() => onSubmit(parsed)}
      >
        <Save className="h-4 w-4" />
        <T en="Save snapshot">Enregistrer le snapshot</T>
      </Button>
    </div>
  );
};

// ──────────────── Movement form ────────────────

const MovementForm = ({ addresses, onSubmit, onBack }: {
  addresses: TreasuryAddressWithBalance[];
  onSubmit: (input: {
    fromAddressId: string | null; toAddressId: string | null;
    amountUsdt: number; txHash: string; reason: MovementReason; notes: string;
  }) => void;
  onBack: () => void;
}) => {
  const [fromId, setFromId] = useState<string>("");
  const [toId, setToId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [reason, setReason] = useState<MovementReason>("rebalancing");
  const [notes, setNotes] = useState("");

  const parsed = Number(amount);
  const hasEndpoint = fromId || toId;
  const validAmt = amount.length > 0 && !Number.isNaN(parsed) && parsed > 0;
  const valid = Boolean(hasEndpoint && validAmt && fromId !== toId);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <BackButton onClick={onBack} />
        <div>
          <h3 className="font-display text-[17px] font-semibold tracking-tight">
            <T en="Record a treasury movement">Enregistrer un mouvement de trésorerie</T>
          </h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            <T en="Rebalancing, liquidation, top-up — at least one endpoint is required.">
              Rééquilibrage, liquidation, approvisionnement — au moins une extrémité requise.
            </T>
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Depuis" hint="Vide si entrée externe">
            <SelectWrap>
              <select value={fromId} onChange={(e) => setFromId(e.target.value)} className={cn(inputCn, "appearance-none pr-10")}>
                <option value="">—</option>
                {addresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label} ({NETWORKS.find((n) => n.id === a.network)?.tag})
                  </option>
                ))}
              </select>
            </SelectWrap>
          </Field>
          <Field label="Vers" hint="Vide si sortie externe">
            <SelectWrap>
              <select value={toId} onChange={(e) => setToId(e.target.value)} className={cn(inputCn, "appearance-none pr-10")}>
                <option value="">—</option>
                {addresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label} ({NETWORKS.find((n) => n.id === a.network)?.tag})
                  </option>
                ))}
              </select>
            </SelectWrap>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Montant USDT" required>
            <input
              type="text" inputMode="decimal" value={amount}
              onChange={(e) => setAmount(e.target.value.replace(",", "."))}
              className={cn(inputCn, "tabular-nums")}
            />
          </Field>
          <Field label="Motif" required>
            <SelectWrap>
              <select value={reason} onChange={(e) => setReason(e.target.value as MovementReason)} className={cn(inputCn, "appearance-none pr-10")}>
                {MOVEMENT_REASONS.map((r) => (
                  <option key={r} value={r}>{REASON_LABEL[r].fr}</option>
                ))}
              </select>
            </SelectWrap>
          </Field>
        </div>

        <Field label="Tx hash" hint="Facultatif">
          <input
            type="text" value={txHash} onChange={(e) => setTxHash(e.target.value)}
            placeholder="0x… ou signature Solana" className={cn(inputCn, "font-mono text-[13px]")}
          />
        </Field>

        <Field label="Notes" hint="Facultatif">
          <textarea
            value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            placeholder="Contexte, référence interne…" className={cn(inputCn, "resize-none")}
          />
        </Field>

        {fromId && toId && fromId === toId && (
          <p className="text-[12px] text-destructive">
            <T en="Source and destination must differ.">La source et la destination doivent différer.</T>
          </p>
        )}
      </div>

      <Button
        variant="appSolid" shape="rounded"
        className="h-auto w-full gap-2 rounded-xl px-5 py-3.5 text-[14px] font-bold"
        disabled={!valid}
        onClick={() => onSubmit({
          fromAddressId: fromId || null, toAddressId: toId || null,
          amountUsdt: parsed, txHash, reason, notes,
        })}
      >
        <ArrowRightLeft className="h-4 w-4" />
        <T en="Record movement">Enregistrer le mouvement</T>
      </Button>
    </div>
  );
};

// ──────────────── Alerts config view ────────────────

const AlertsConfigView = ({ configs, onSave }: {
  configs: TreasuryAlertConfig[];
  onSave: (network: NetId, threshold: number, enabled: boolean) => void;
}) => {
  const [drafts, setDrafts] = useState<Record<NetId, { threshold: string; enabled: boolean }>>(() => {
    const out = {} as Record<NetId, { threshold: string; enabled: boolean }>;
    for (const n of NETWORKS) {
      const cfg = configs.find((c) => c.network === n.id);
      out[n.id] = {
        threshold: cfg ? String(cfg.lowBalanceThresholdUsdt) : "1000",
        enabled: cfg ? cfg.alertEnabled : true,
      };
    }
    return out;
  });

  const set = (net: NetId, patch: Partial<{ threshold: string; enabled: boolean }>) =>
    setDrafts((prev) => ({ ...prev, [net]: { ...prev[net], ...patch } }));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-[13px] text-muted-foreground">
          <T en="Define one low-balance threshold per network. Alerts trigger when the latest snapshot of an active address falls below the threshold.">
            Définissez un seuil de solde bas par réseau. Les alertes se déclenchent quand le dernier snapshot
            d'une adresse active passe sous le seuil.
          </T>
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {NETWORKS.map((n, i) => {
          const d = drafts[n.id];
          const original = configs.find((c) => c.network === n.id);
          const changed =
            !original ||
            Number(d.threshold) !== original.lowBalanceThresholdUsdt ||
            d.enabled !== original.alertEnabled;
          return (
            <div
              key={n.id}
              className={cn(
                "grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-5 py-4",
                i < NETWORKS.length - 1 && "border-b border-border",
              )}
            >
              <NetworkCoin id={n.id} className="h-9 w-9" />
              <div className="min-w-0">
                <p className="text-[13px] font-medium">{n.name}</p>
                <p className="text-[11.5px] text-muted-foreground">{n.tag}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text" inputMode="decimal" value={d.threshold}
                  onChange={(e) => set(n.id, { threshold: e.target.value.replace(",", ".") })}
                  className="w-28 rounded-lg border border-border bg-card px-3 py-2 text-right text-[13px] tabular-nums outline-none focus:border-foreground"
                />
                <span className="text-[11.5px] text-muted-foreground">USDT</span>
                <label className="ml-3 flex cursor-pointer items-center gap-1.5">
                  <input
                    type="checkbox" checked={d.enabled}
                    onChange={(e) => set(n.id, { enabled: e.target.checked })}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span className="text-[11.5px] text-muted-foreground">
                    <T en="Enabled">Activé</T>
                  </span>
                </label>
              </div>
              <Button
                variant="appOutline" shape="rounded"
                className="h-auto gap-1 rounded-[9px] px-3 py-[6px] text-[11.5px]"
                disabled={!changed || Number.isNaN(Number(d.threshold))}
                onClick={() => onSave(n.id, Number(d.threshold), d.enabled)}
              >
                <Save className="h-3 w-3" />
                <T en="Save">Enregistrer</T>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ──────────────── Reconciliation view ────────────────

const ReconciliationView = ({ addresses, outflows }: {
  addresses: TreasuryAddressWithBalance[];
  outflows: ExpectedOutflows;
}) => {
  const hotByNetwork = useMemo(() => {
    const out: Record<NetId, number> = { trx: 0, bnb: 0, eth: 0, matic: 0, sol: 0, avax: 0 };
    for (const a of addresses) {
      if (!a.active) continue;
      if (a.purpose !== "hot" && a.purpose !== "deposit") continue;
      if (a.latestBalance != null) out[a.network] += a.latestBalance;
    }
    return out;
  }, [addresses]);

  const rows = NETWORKS.map((n) => {
    const hot = hotByNetwork[n.id];
    const need = outflows.byNetwork[n.id];
    const gap = hot - need;
    return { net: n, hot, need, gap };
  });

  const totalHot = rows.reduce((s, r) => s + r.hot, 0);
  const totalNeed = outflows.total;
  const totalGap = totalHot - totalNeed;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard label="Hot + Dépôt" value={`${nfUsdt.format(totalHot)} USDT`} sub="Disponible côté hot & dépôt" />
        <SummaryCard label="Engagements" value={`${nfUsdt.format(totalNeed)} USDT`} sub={`${outflows.openBuyOrders} achat(s) ouverts`} />
        <SummaryCard
          label="Marge"
          value={`${totalGap >= 0 ? "" : "−"}${nfUsdt.format(Math.abs(totalGap))} USDT`}
          sub={totalGap >= 0 ? "Couverture OK" : "Découvert — réapprovisionner"}
          urgent={totalGap < 0}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {/* En-têtes desktop */}
        <div className="hidden grid-cols-[1fr_1fr_1fr_1fr] items-center gap-3 border-b border-border px-4 py-2.5 md:grid">
          {["Réseau", "Hot + Dépôt", "Attendu (achats)", "Marge"].map((h) => (
            <span key={h} className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">{h}</span>
          ))}
        </div>
        {/* En-têtes mobile — condensés : réseau + marge */}
        <div className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-border px-4 py-2 md:hidden">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground"><T en="Network">Réseau</T></span>
          <span className="text-right text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground"><T en="Margin">Marge</T></span>
        </div>
        {rows.map((r, i) => {
          const short = r.gap < 0;
          return (
            <div
              key={r.net.id}
              className={cn(
                "grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 md:grid-cols-[1fr_1fr_1fr_1fr]",
                i < rows.length - 1 && "border-b border-border",
              )}
            >
              <div className="flex min-w-0 items-center gap-2">
                <NetworkCoin id={r.net.id} className="h-6 w-6 shrink-0" />
                <div className="min-w-0">
                  <p className="truncate text-[13px]">{r.net.name}</p>
                  {/* Mobile : sous le nom, le détail hot / need en petit */}
                  <p className="mt-0.5 truncate text-[10.5px] tabular-nums text-muted-foreground md:hidden">
                    {nfUsdt.format(r.hot)} / <T en="needed">à envoyer</T> {nfUsdt.format(r.need)}
                  </p>
                </div>
              </div>
              <span className="hidden text-right tabular-nums text-[13px] md:table-cell md:block">{nfUsdt.format(r.hot)}</span>
              <span className="hidden tabular-nums text-[13px] text-muted-foreground md:block">{nfUsdt.format(r.need)}</span>
              {/* Marge : critique, visible partout */}
              <span className={cn("text-right tabular-nums text-[13px] font-semibold", short ? "text-destructive" : "text-foreground")}>
                {short ? "−" : ""}{nfUsdt.format(Math.abs(r.gap))}
              </span>
            </div>
          );
        })}
      </div>

      <p className="px-1 text-[12px] text-muted-foreground">
        <T en="'Expected outflows' sums USDT owed to clients on buy orders in state created / awaiting_payment / payment_received / settling.">
          « Sorties attendues » : total USDT dûs aux clients pour les achats en état
          created / awaiting_payment / payment_received / settling.
        </T>
      </p>
    </div>
  );
};

// ──────────────── Main panel ────────────────

type TreasuryTab = "overview" | "alerts" | "reconcile";
type PanelView = "main" | "address-form" | "snapshot" | "movement";

const TreasuryPanel = (_props: { orders: AdminOrder[] }) => {
  const [view, setView] = useState<PanelView>("main");
  const [tab, setTab] = useState<TreasuryTab>("overview");
  const [addresses, setAddresses] = useState<TreasuryAddressWithBalance[]>([]);
  const [configs, setConfigs] = useState<TreasuryAlertConfig[]>([]);
  const [alerts, setAlerts] = useState<LowBalanceAlert[]>([]);
  const [outflows, setOutflows] = useState<ExpectedOutflows>({
    byNetwork: { trx: 0, bnb: 0, eth: 0, matic: 0, sol: 0, avax: 0 },
    total: 0, openBuyOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [snapshotId, setSnapshotId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    const [a, c, l, o] = await Promise.all([
      listAddresses(), getAlertConfig(), getLowBalanceAlerts(), getExpectedOutflows(),
    ]);
    setAddresses(a); setConfigs(c); setAlerts(l); setOutflows(o);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 3500);
    return () => clearTimeout(t);
  }, [successMsg]);

  useEffect(() => {
    if (!errorMsg) return;
    const t = setTimeout(() => setErrorMsg(null), 5000);
    return () => clearTimeout(t);
  }, [errorMsg]);

  const goBack = () => { setView("main"); setEditingId(null); setSnapshotId(null); };

  const openAdd = () => { setEditingId(null); setView("address-form"); };
  const openEdit = (id: string) => { setEditingId(id); setView("address-form"); };
  const openSnapshot = (id: string) => { setSnapshotId(id); setView("snapshot"); };

  const submitAddress = async (values: {
    id?: string; network: NetId; label: string; address: string;
    purpose: TreasuryPurpose; active: boolean;
  }) => {
    const res = await saveAddress(values);
    if ("error" in res) { setErrorMsg(res.error); return; }
    setSuccessMsg(values.id ? "Adresse mise à jour." : "Adresse ajoutée.");
    goBack();
    await refresh();
  };

  const submitSnapshot = async (balance: number) => {
    if (!snapshotId) return;
    const res = await recordSnapshot({ addressId: snapshotId, balanceUsdt: balance });
    if ("error" in res) { setErrorMsg(res.error); return; }
    setSuccessMsg("Snapshot enregistré.");
    goBack();
    await refresh();
  };

  const submitMovement = async (input: {
    fromAddressId: string | null; toAddressId: string | null;
    amountUsdt: number; txHash: string; reason: MovementReason; notes: string;
  }) => {
    const res = await recordMovement({
      fromAddressId: input.fromAddressId,
      toAddressId: input.toAddressId,
      amountUsdt: input.amountUsdt,
      txHash: input.txHash,
      reason: input.reason,
      notes: input.notes,
    });
    if ("error" in res) { setErrorMsg(res.error); return; }
    setSuccessMsg("Mouvement enregistré.");
    goBack();
    await refresh();
  };

  const submitAlertConfig = async (network: NetId, threshold: number, enabled: boolean) => {
    const res = await saveAlertConfig(network, threshold, enabled);
    if ("error" in res) { setErrorMsg(res.error); return; }
    setSuccessMsg("Configuration d'alerte enregistrée.");
    await refresh();
  };

  const editingAddress = editingId ? addresses.find((a) => a.id === editingId) ?? null : null;
  const snapshotAddress = snapshotId ? addresses.find((a) => a.id === snapshotId) ?? null : null;

  const TABS = [
    { id: "overview", label: "Vue d'ensemble", count: undefined },
    { id: "alerts", label: "Alertes", count: alerts.length || undefined },
    { id: "reconcile", label: "Réconciliation", count: undefined },
  ];

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card py-16 text-center text-[13px] text-muted-foreground">
        <T en="Loading treasury…">Chargement de la trésorerie…</T>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {successMsg && <SuccessBanner message={successMsg} />}
      {errorMsg && <ErrorBanner message={errorMsg} />}

      {view === "address-form" && (
        <AddressForm initial={editingAddress} onSubmit={submitAddress} onBack={goBack} />
      )}
      {view === "snapshot" && snapshotAddress && (
        <SnapshotForm address={snapshotAddress} onSubmit={submitSnapshot} onBack={goBack} />
      )}
      {view === "movement" && (
        <MovementForm addresses={addresses} onSubmit={submitMovement} onBack={goBack} />
      )}

      {view === "main" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SubTabs tabs={TABS} active={tab} onChange={(id) => setTab(id as TreasuryTab)} />
            <Button
              variant="appOutline" shape="rounded"
              className="h-auto gap-1.5 rounded-xl px-4 py-2 text-[12.5px] font-bold"
              onClick={() => setView("movement")}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              <T en="New movement">Nouveau mouvement</T>
            </Button>
          </div>

          {tab === "overview" && (
            <OverviewView
              addresses={addresses}
              configs={configs}
              alerts={alerts}
              outflows={outflows}
              onAdd={openAdd}
              onEdit={openEdit}
              onSnapshot={openSnapshot}
            />
          )}
          {tab === "alerts" && (
            <AlertsConfigView configs={configs} onSave={submitAlertConfig} />
          )}
          {tab === "reconcile" && (
            <ReconciliationView addresses={addresses} outflows={outflows} />
          )}
        </>
      )}
    </div>
  );
};

export default TreasuryPanel;
