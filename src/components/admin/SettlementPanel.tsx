import { useCallback, useEffect, useState } from "react";
import { Check, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  fetchPayouts, fetchReceipts, fetchWallets, reconcilePayouts, txUrl, updateSettings,
  type InteracReceipt, type SettlementSettings, type UsdtPayout, type WalletState,
} from "@/lib/settlement";
import { SubTabs } from "./AdminBits";
import AdminHero from "./AdminHero";

/*
 * Règlement des achats : portefeuille d'envoi (soldes par réseau), plafond,
 * avis Interac lus sur interac@ooble.ca et envois d'USDT. Règle : le système
 * prépare et vérifie, l'humain déclenche — chaque envoi part d'un clic sur
 * « Envoyer les USDT », dans la fiche de l'ordre.
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

type Tab = "wallet" | "receipts" | "payouts";

const SettlementPanel = () => {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>("wallet");
  const [wallets, setWallets] = useState<WalletState[] | null>(null);
  const [settings, setSettings] = useState<SettlementSettings | null>(null);
  const [draft, setDraft] = useState<SettlementSettings | null>(null);
  const [receipts, setReceipts] = useState<InteracReceipt[]>([]);
  const [payouts, setPayouts] = useState<UsdtPayout[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    const [w, r, p] = await Promise.all([fetchWallets(), fetchReceipts(), fetchPayouts()]);
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
    const res = await updateSettings({ daily_payout_max_usdt: Number(draft.daily_payout_max_usdt) });
    setSaving(false);
    if (res.error) setErr(res.error); else void load();
  };

  const configured = (wallets ?? []).filter((w) => w.configured);
  const total = configured.reduce((s, w) => s + (w.usdt ?? 0), 0);
  const toReview = receipts.filter((r) => r.status === "mismatch" || r.status === "unmatched").length
    + payouts.filter((p) => p.status === "review").length;
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
            { label: "Envoi", value: "Sur clic de l'équipe" },
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
              <p className="text-[14px] font-medium">Règles d'envoi</p>
              <ul className="space-y-2 text-[13px] leading-relaxed text-muted-foreground">
                <li>Un avis Interac authentique (signature d'Interac vérifiée) dont la référence, le montant et le nom concordent fait passer l'achat à « paiement reçu ».</li>
                <li>Aucun envoi ne part seul : un membre de l'équipe clique « Envoyer les USDT » dans la fiche de l'ordre, après avoir vérifié le dépôt dans le compte bancaire.</li>
                <li>Un seul envoi par ordre ; soldes, adresse et plafond sont contrôlés avant chaque envoi.</li>
              </ul>
              <label className="block text-[12px] font-medium">
                Plafond des envois sur 24 h (USDT)
                <input className={cn(inputCn, "mt-1.5")} type="number" min={0} disabled={!isAdmin} value={draft.daily_payout_max_usdt} onChange={(e) => setDraft({ ...draft, daily_payout_max_usdt: Number(e.target.value) })} />
              </label>
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
