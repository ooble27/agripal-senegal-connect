import { useCallback, useEffect, useState } from "react";
import { Check, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  attachDeposit, fetchDeposits, fetchPayouts, fetchPendingSells, fetchReceipts, fetchScanState, fetchWallets,
  ignoreDeposit, reconcilePayouts, scanDeposits, txUrl, updateSettings,
  type ChainDeposit, type InteracReceipt, type SettlementSettings, type UsdtPayout, type WalletState,
} from "@/lib/settlement";
import { SubTabs } from "./AdminBits";
import AdminHero from "./AdminHero";

/*
 * Règlement des achats et des ventes : portefeuille d'envoi (soldes par
 * réseau), réglages de l'envoi automatique, avis Interac lus sur
 * interac@ooble.ca, envois d'USDT, et USDT reçus pour les ventes (lus sur la
 * blockchain toutes les 2 minutes). Un virement rapproché déclenche l'envoi
 * seul si les réglages le permettent ; sinon l'équipe clique « Envoyer les
 * USDT » dans la fiche. Une vente dont les USDT sont rapprochés passe à
 * « paiement reçu » : il reste à envoyer le virement Interac (fiche).
 */

const dateFmt = new Intl.DateTimeFormat("fr-CA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const nf = (n: number, d = 2) => new Intl.NumberFormat("fr-CA", { maximumFractionDigits: d }).format(n);
const ref = (id: string | null) => (id ? `OOB-${id.slice(0, 8).toUpperCase()}` : "—");
const inputCn = "w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-[13px] outline-none focus:border-foreground";

const RECEIPT: Record<InteracReceipt["status"], { label: string; cls: string }> = {
  matched: { label: "Rapproché", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  unmatched: { label: "Sans ordre", cls: "bg-amber-500/20 text-amber-700 dark:text-amber-300" },
  mismatch: { label: "À vérifier", cls: "bg-destructive/15 text-destructive" },
  duplicate: { label: "Doublon", cls: "bg-secondary text-muted-foreground" },
  ignored: { label: "Ignoré", cls: "bg-secondary text-muted-foreground" },
};
export const PAYOUT: Record<UsdtPayout["status"], { label: string; cls: string }> = {
  sending: { label: "Envoi…", cls: "bg-secondary text-foreground" },
  broadcast: { label: "Diffusé", cls: "bg-secondary text-foreground" },
  confirmed: { label: "Confirmé", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  failed: { label: "Échoué", cls: "bg-amber-500/20 text-amber-700 dark:text-amber-300" },
  review: { label: "À vérifier", cls: "bg-destructive/15 text-destructive" },
};
export const DEPOSIT: Record<ChainDeposit["status"], { label: string; cls: string }> = {
  new: { label: "En attente d'une vente", cls: "bg-secondary text-foreground" },
  matched: { label: "Rapproché", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  review: { label: "À vérifier", cls: "bg-destructive/15 text-destructive" },
  unmatched: { label: "Sans vente", cls: "bg-amber-500/20 text-amber-700 dark:text-amber-300" },
  ignored: { label: "Écarté", cls: "bg-secondary text-muted-foreground" },
};
const NET_NAME: Record<string, string> = { trc20: "Tron", bep20: "BNB Chain", polygon: "Polygon", avalanche: "Avalanche", erc20: "Ethereum" };

/** Rattacher un dépôt à une vente en attente, ou l'écarter avec un motif. */
const DepositActions = ({ d, onDone }: { d: ChainDeposit; onDone: () => void }) => {
  const [sells, setSells] = useState<{ id: string; usdt_amount: number; created_at: string }[] | null>(null);
  const [pick, setPick] = useState(d.order_id ?? "");
  const [why, setWhy] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { fetchPendingSells(d.network).then(setSells); }, [d.network]);
  const run = async (fn: () => Promise<{ error?: string }>) => {
    setMsg(null);
    const r = await fn();
    if (r.error) setMsg(r.error); else onDone();
  };
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <p className="font-medium text-foreground">Rattacher à une vente</p>
        <select className={inputCn} value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="">{sells === null ? "Chargement…" : sells.length ? "Choisir la vente…" : "Aucune vente en attente sur ce réseau"}</option>
          {(sells ?? []).map((o) => <option key={o.id} value={o.id}>{ref(o.id)} · {nf(Number(o.usdt_amount))} USDT · {dateFmt.format(new Date(o.created_at))}</option>)}
        </select>
        <Button variant="appSolid" shape="rounded" className="h-auto px-3.5 py-2 text-[12.5px]" disabled={!pick} onClick={() => run(() => attachDeposit(d.id, pick))}>
          Rattacher
        </Button>
      </div>
      <div className="space-y-2">
        <p className="font-medium text-foreground">Écarter</p>
        <input className={inputCn} placeholder="Motif : test interne, remboursé…" value={why} onChange={(e) => setWhy(e.target.value)} />
        <Button variant="appOutline" shape="rounded" className="h-auto px-3.5 py-2 text-[12.5px]" disabled={!why.trim()} onClick={() => run(() => ignoreDeposit(d.id, why))}>
          Écarter ce dépôt
        </Button>
      </div>
      {msg && <p className="text-destructive sm:col-span-2">{msg}</p>}
    </div>
  );
};

export const Pill = ({ m }: { m: { label: string; cls: string } }) => (
  <span className={cn("inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", m.cls)}>{m.label}</span>
);

const CopyBtn = ({ value }: { value: string }) => {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copier"
      className="text-muted-foreground hover:text-foreground"
      onClick={() => { void navigator.clipboard.writeText(value); setOk(true); setTimeout(() => setOk(false), 1200); }}
    >
      {ok ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
};

type Tab = "wallet" | "receipts" | "payouts" | "deposits";

const SettlementPanel = () => {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>("wallet");
  const [wallets, setWallets] = useState<WalletState[] | null>(null);
  const [settings, setSettings] = useState<SettlementSettings | null>(null);
  const [draft, setDraft] = useState<SettlementSettings | null>(null);
  const [receipts, setReceipts] = useState<InteracReceipt[]>([]);
  const [payouts, setPayouts] = useState<UsdtPayout[]>([]);
  const [deposits, setDeposits] = useState<ChainDeposit[]>([]);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    const [w, r, p, d, sc] = await Promise.all([fetchWallets(), fetchReceipts(), fetchPayouts(), fetchDeposits(), fetchScanState()]);
    setDeposits(d);
    setLastScan(sc.map((x) => x.updated_at).sort().pop() ?? null);
    if (!w.ok) setErr(w.error ?? "Portefeuille indisponible.");
    else { setErr(null); setWallets(w.wallets ?? []); setSettings(w.settings ?? null); setDraft(w.settings ?? null); }
    setReceipts(r);
    setPayouts(p);
    setBusy(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    const res = await updateSettings({
      auto_payout: draft.auto_payout,
      auto_payout_max_cad: Number(draft.auto_payout_max_cad),
      daily_payout_max_usdt: Number(draft.daily_payout_max_usdt),
    });
    setSaving(false);
    if (res.error) setErr(res.error); else void load();
  };

  const configured = (wallets ?? []).filter((w) => w.configured);
  const total = configured.reduce((s, w) => s + (w.usdt ?? 0), 0);
  const toReview = receipts.filter((r) => r.status === "mismatch" || r.status === "unmatched").length
    + payouts.filter((p) => p.status === "review").length
    + deposits.filter((d) => d.status === "review" || d.status === "unmatched").length;
  const scanNow = async () => {
    setScanMsg("Lecture des blockchains…");
    const r = await scanDeposits();
    setScanMsg(r.error ? `Lecture impossible : ${r.error}` : `${r.found ?? 0} nouveau(x) dépôt(s), ${r.matched ?? 0} vente(s) rapprochée(s).`);
    void load();
  };
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);

  return (
    <div className="space-y-4">
      <div className="lg:max-w-[620px]">
        <AdminHero
          eyebrow="Portefeuille chaud"
          loading={wallets === null && !err}
          value={nf(total)}
          unit="USDT"
          stats={[
            { label: "Envoi", value: settings?.auto_payout ? "Automatique" : "Manuel", hint: settings?.auto_payout ? `≤ ${nf(settings.auto_payout_max_cad, 0)} $` : undefined },
            { label: "Réseaux prêts", value: `${configured.filter((w) => !w.error).length} / ${(wallets ?? []).length || 5}` },
            { label: "À vérifier", value: toReview },
          ]}
          actions={[
            { label: busy ? "Actualisation…" : "Actualiser", icon: RefreshCw, primary: true, onClick: () => { void reconcilePayouts().then(load); } },
          ]}
        />
      </div>

      {err && <p className="rounded-xl bg-destructive/10 px-4 py-3 text-[13px] text-destructive">{err}</p>}

      <SubTabs
        tabs={[
          { id: "wallet", label: "Portefeuille et réglages" },
          { id: "receipts", label: "Avis Interac", count: receipts.length },
          { id: "payouts", label: "Envois USDT", count: payouts.length },
          { id: "deposits", label: "Dépôts USDT (ventes)", count: deposits.filter((d) => d.status === "review" || d.status === "unmatched" || d.status === "new").length || undefined },
        ]}
        active={tab}
        onChange={(id) => setTab(id as Tab)}
      />

      {tab === "wallet" && (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {(wallets ?? []).map((w, i) => {
              const lowGas = w.configured && !w.error && (w.gas ?? 0) < (w.minGas ?? 0);
              return (
                <div key={w.network} className={cn("px-5 py-4", i > 0 && "border-t border-border")}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[14px] font-medium">{w.label}</p>
                    {!w.configured ? (
                      <span className="text-[12px] text-muted-foreground">Clé non configurée</span>
                    ) : w.error ? (
                      <span className="text-[12px] text-destructive">Erreur réseau</span>
                    ) : (
                      <p className="text-right text-[13px] tabular-nums">
                        <span className="font-medium">{nf(w.usdt ?? 0)} USDT</span>
                        <span className={cn("ml-3", lowGas ? "text-destructive" : "text-muted-foreground")}>
                          {nf(w.gas ?? 0, 4)} {w.gasSymbol}
                        </span>
                      </p>
                    )}
                  </div>
                  {w.address && (
                    <p className="mt-1.5 flex items-center gap-2 font-mono text-[11.5px] text-muted-foreground">
                      <span className="truncate">{w.address}</span>
                      <CopyBtn value={w.address} />
                    </p>
                  )}
                  {lowGas && <p className="mt-1.5 text-[12px] text-destructive">Frais insuffisants : minimum {w.minGas} {w.gasSymbol}.</p>}
                  {w.error && <p className="mt-1.5 text-[12px] text-muted-foreground">{w.error}</p>}
                </div>
              );
            })}
            <p className="border-t border-border bg-secondary/40 px-5 py-3 text-[12px] leading-relaxed text-muted-foreground">
              Solana reste manuel pour l'instant. Approvisionnez chaque adresse en USDT et en jeton de frais
              (TRX, BNB, POL, AVAX ou ETH) depuis votre réserve. Gardez-y seulement le nécessaire aux envois du moment.
            </p>
          </div>

          {draft && (
            <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
              <p className="text-[14px] font-medium">Envoi automatique</p>
              <label className="flex items-start gap-3 text-[13px]">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[hsl(var(--foreground))]" disabled={!isAdmin} checked={draft.auto_payout} onChange={(e) => setDraft({ ...draft, auto_payout: e.target.checked })} />
                <span>Envoyer les USDT dès qu'un virement Interac est reçu et rapproché d'un achat, sans clic de l'équipe.</span>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-[12px] font-medium">
                  Maximum par commande (CAD)
                  <input className={cn(inputCn, "mt-1.5")} type="number" min={0} disabled={!isAdmin} value={draft.auto_payout_max_cad} onChange={(e) => setDraft({ ...draft, auto_payout_max_cad: Number(e.target.value) })} />
                </label>
                <label className="block text-[12px] font-medium">
                  Plafond sur 24 h (USDT)
                  <input className={cn(inputCn, "mt-1.5")} type="number" min={0} disabled={!isAdmin} value={draft.daily_payout_max_usdt} onChange={(e) => setDraft({ ...draft, daily_payout_max_usdt: Number(e.target.value) })} />
                </label>
              </div>
              <ul className="space-y-1.5 text-[12px] leading-relaxed text-muted-foreground">
                <li>L'envoi part seul seulement si : l'avis Interac est authentique (signature d'Interac), la référence, le montant exact et le nom du client concordent, le client est vérifié, et le montant est sous le maximum par commande.</li>
                <li>Sinon, l'achat reste « paiement reçu » et l'équipe clique « Envoyer les USDT » dans sa fiche. La raison est notée dans l'historique de la commande.</li>
                <li>Le plafond sur 24 h s'applique à tous les envois, automatiques ou non. Décochez la case pour tout repasser en manuel.</li>
              </ul>
              {isAdmin ? (
                <Button variant="appSolid" shape="rounded" className="h-auto px-4 py-2.5 text-[13px]" disabled={!dirty || saving} onClick={save}>
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </Button>
              ) : (
                <p className="text-[12px] text-muted-foreground">Seul un administrateur peut modifier ces réglages.</p>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "receipts" && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {receipts.length === 0 && <p className="px-5 py-8 text-center text-[13px] text-muted-foreground">Aucun avis reçu pour l'instant sur interac@ooble.ca.</p>}
          {receipts.map((r, i) => (
            <div key={r.id} className={cn(i > 0 && "border-t border-border")}>
              <button type="button" className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-secondary/40" onClick={() => setOpen(open === r.id ? null : r.id)}>
                <Pill m={RECEIPT[r.status]} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{r.sender_name || "Expéditeur inconnu"} · {r.amount_cad != null ? `${nf(r.amount_cad)} $` : "—"}</span>
                  <span className="block truncate text-[12px] text-muted-foreground">{r.order_ref ?? "Sans référence"} — {r.reason}</span>
                </span>
                <span className="shrink-0 text-[12px] text-muted-foreground">{dateFmt.format(new Date(r.received_at))}</span>
              </button>
              {open === r.id && (
                <div className="space-y-2 border-t border-border bg-secondary/30 px-5 py-4 text-[12px]">
                  <p><span className="text-muted-foreground">Réf. Interac :</span> {r.interac_ref ?? "—"} · <span className="text-muted-foreground">Avis authentifié :</span> {r.authenticated ? "oui" : "non"}</p>
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-sans text-[12px] text-muted-foreground">{r.body_text}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "deposits" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-[12.5px] text-muted-foreground">
            <span>
              Lu toutes les 2 minutes sur Tron, BNB Chain, Polygon, Avalanche et Ethereum (Solana : à vérifier à la main).
              {lastScan && <> Dernière lecture : {dateFmt.format(new Date(lastScan))}.</>}
            </span>
            <button type="button" onClick={scanNow} className="inline-flex items-center gap-1.5 font-medium text-foreground underline-offset-4 hover:underline">
              <RefreshCw className="h-3.5 w-3.5" /> Lire maintenant
            </button>
          </div>
          {scanMsg && <p className="px-1 text-[12.5px]">{scanMsg}</p>}
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {deposits.length === 0 && <p className="px-5 py-8 text-center text-[13px] text-muted-foreground">Aucun dépôt d'USDT lu pour l'instant.</p>}
            {deposits.map((d, i) => (
              <div key={d.id} className={cn(i > 0 && "border-t border-border")}>
                <button type="button" className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-secondary/40" onClick={() => setOpen(open === d.id ? null : d.id)}>
                  <Pill m={DEPOSIT[d.status]} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{nf(Number(d.usdt_amount))} USDT · {NET_NAME[d.network] ?? d.network}{d.order_id ? ` · ${ref(d.order_id)}` : ""}</span>
                    <span className="block truncate text-[12px] text-muted-foreground">{d.reason ?? "En attente d'une vente du même montant (le client clique « J'ai envoyé mes USDT » après l'envoi)."}</span>
                  </span>
                  <span className="shrink-0 text-[12px] text-muted-foreground">{dateFmt.format(new Date(d.block_time))}</span>
                </button>
                {open === d.id && (
                  <div className="border-t border-border bg-secondary/30 px-5 py-4 text-[12px] text-muted-foreground">
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>Expéditeur : <span className="font-mono text-foreground">{d.from_address ?? "—"}</span></span>
                      {txUrl(d.network, d.tx_hash) && (
                        <a href={txUrl(d.network, d.tx_hash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline">
                          Voir la transaction <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </p>
                    {d.status !== "matched" && d.status !== "ignored" && <DepositActions d={d} onDone={() => { setOpen(null); void load(); }} />}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "payouts" && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {payouts.length === 0 && <p className="px-5 py-8 text-center text-[13px] text-muted-foreground">Aucun envoi pour l'instant.</p>}
          {payouts.map((p, i) => (
            <div key={p.id} className={cn("flex items-center gap-3 px-5 py-3.5", i > 0 && "border-t border-border")}>
              <Pill m={PAYOUT[p.status]} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{ref(p.order_id)} · {nf(Number(p.usdt_amount))} USDT · {p.network.toUpperCase()}</span>
                <span className="block truncate font-mono text-[11.5px] text-muted-foreground">{p.error ?? p.to_address}</span>
              </span>
              {p.tx_hash && txUrl(p.network, p.tx_hash) && (
                <a href={txUrl(p.network, p.tx_hash)} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-[12px] underline-offset-4 hover:underline">
                  Transaction <ExternalLink className="h-3 w-3" />
                </a>
              )}
              <span className="shrink-0 text-[12px] text-muted-foreground">{p.trigger === "auto" ? "Auto" : "Équipe"} · {dateFmt.format(new Date(p.created_at))}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SettlementPanel;
