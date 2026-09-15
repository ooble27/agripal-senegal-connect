import { useEffect, useState } from "react";
import { ArrowLeft, Copy, Check, Coins, HandCoins, ChevronRight, Wand2, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { nfCad } from "@/lib/adminOrders";
import { orderRef } from "@/lib/orders";
import {
  fetchClientProfile, fetchClientOrders, KYC_LABEL,
  type ClientProfile as ClientProfileData, type ClientOrder,
} from "@/lib/adminClient";
import { summarizeClient, isAIError, toAIClientContext, toAIOrderSummaries } from "@/lib/ai";
import { C, FONT, card, heroCard, heroNumber, heroUnit, sH } from "./adminTheme";
import ClientNotes from "./ClientNotes";
import ClientTimeline from "./ClientTimeline";
import RiskScoreCard from "./RiskScoreCard";

interface Props {
  userId: string;
  clientName: string;
  onBack: () => void;
  onOpenOrder?: (orderId: string) => void;
}

const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const dateFmt = new Intl.DateTimeFormat("fr-CA", { day: "numeric", month: "long", year: "numeric" });
const dateFmtShort = new Intl.DateTimeFormat("fr-CA", { day: "numeric", month: "short" });
const nf = new Intl.NumberFormat("fr-CA", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
const nfUsdt = new Intl.NumberFormat("fr-CA", { maximumFractionDigits: 2 });

const STATUS_FR: Record<string, string> = {
  created: "Créée",
  awaiting_payment: "En attente",
  payment_received: "À traiter",
  settling: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
  expired: "Expirée",
};

const ClientProfile = ({ userId, clientName, onBack, onOpenOrder }: Props) => {
  const [profile, setProfile] = useState<ClientProfileData | null>(null);
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  // Résumé IA — chargé à la demande sur clic du bouton « Résumer ».
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const runSummary = async () => {
    if (!profile || aiBusy) return;
    setAiBusy(true);
    setAiError(null);
    const res = await summarizeClient({
      client: toAIClientContext(profile),
      orders: toAIOrderSummaries(orders),
    });
    setAiBusy(false);
    if (isAIError(res)) setAiError(res.error);
    else setAiSummary(res.summary);
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([fetchClientProfile(userId), fetchClientOrders(userId)]).then(([p, o]) => {
      if (!active) return;
      setProfile(p);
      setOrders(o);
      setLoading(false);
    });
    return () => { active = false; };
  }, [userId]);

  const copy = (value: string, key: string) => {
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1200);
  };

  const Row = ({ label, value, mono, copyKey }: { label: string; value?: string | null; mono?: boolean; copyKey?: string }) => (
    <div className="flex items-start justify-between gap-4 px-5 py-3.5">
      <span className="shrink-0 text-[14px] text-muted-foreground">{label}</span>
      <span className="flex min-w-0 items-center gap-2">
        <span className={cn("break-all text-right text-[14px] font-medium", mono && "font-mono text-[12px]")}>{value || "—"}</span>
        {copyKey && value && (
          <button onClick={() => copy(value, copyKey)} className="shrink-0 text-muted-foreground transition-colors hover:text-foreground" aria-label="Copier">
            {copied === copyKey ? <Check className="h-[14px] w-[14px] text-primary" /> : <Copy className="h-[14px] w-[14px]" />}
          </button>
        )}
      </span>
    </div>
  );

  const name = profile?.fullName ?? clientName;

  return (
    <div className="mx-auto w-full max-w-[720px] space-y-4">
      {/* En-tête */}
      <div className="flex items-start gap-3">
        <button
          onClick={onBack}
          aria-label="Retour"
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-secondary active:scale-95"
        >
          <ArrowLeft className="h-[18px] w-[18px]" />
        </button>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold">Fiche client</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">Informations complètes du client</p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card py-16 text-center text-[13px] text-muted-foreground">
          Chargement…
        </div>
      ) : (
        <>
          {/* Héro client — volume mis en avant, identité en bandeau */}
          <div style={{ ...heroCard, fontFamily: FONT }}>
            {/* Bandeau identité */}
            <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 22 }}>
              <span style={{
                width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                background: "rgba(255,255,255,0.08)", border: `1px solid ${C.bds}`,
                color: C.t1, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 400,
              }}>
                {initials(name)}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{
                  color: C.t1, fontSize: 15, fontWeight: 400, margin: 0,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {name}
                </p>
                <p style={{
                  color: C.t3, fontSize: 11.5, margin: "2px 0 0",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {profile?.email || "—"}
                </p>
              </div>
              {profile?.accountType === "business" && (
                <span style={{
                  flexShrink: 0, borderRadius: 999, padding: "4px 10px",
                  background: "rgba(255,255,255,0.06)", border: `1px solid ${C.bds}`,
                  color: C.t2, fontSize: 10.5,
                }}>
                  Entreprise
                </span>
              )}
            </div>

            {/* Volume — le grand chiffre */}
            <p style={{ ...sH, marginBottom: 10 }}>Volume traité</p>
            <p style={heroNumber(40)}>
              {profile ? nfCad.format(profile.totalCad) : "—"}
              <span style={heroUnit}>CAD</span>
            </p>

            {profile && (
              <div style={{ display: "flex", flexWrap: "wrap", marginTop: 22 }}>
                {[
                  { label: "Commandes", value: String(profile.orderCount) },
                  { label: "KYC", value: KYC_LABEL[profile.kycStatus] },
                  { label: "Client depuis", value: dateFmt.format(new Date(profile.createdAt)) },
                ].map((s, i) => (
                  <div key={s.label} style={{ display: "flex", alignItems: "stretch" }}>
                    {i > 0 && <div style={{ width: 1, background: C.bds, marginRight: 20 }} />}
                    <div style={{ paddingRight: 20 }}>
                      <p style={{ ...sH, fontSize: 10, letterSpacing: "0.14em", marginBottom: 5 }}>
                        {s.label}
                      </p>
                      <p style={{
                        color: C.t2, fontSize: 15, fontWeight: 400, margin: 0,
                        fontVariantNumeric: "tabular-nums",
                      }}>
                        {s.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Informations — grille 2 colonnes sur desktop */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              <div className="px-5 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Informations personnelles</p>
              </div>
              <Row label="Nom complet" value={name} />
              <Row label="E-mail" value={profile?.email} mono copyKey="email" />
              <Row label="Téléphone" value={profile?.phone} />
              <Row label="ID utilisateur" value={userId.slice(0, 12) + "…" + userId.slice(-4)} mono copyKey="uid" />
            </div>

            <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              <div className="px-5 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Compte</p>
              </div>
              <Row label="Type" value={profile?.accountType === "business" ? "Entreprise" : "Individuel"} />
              <Row label="Statut KYC" value={profile ? KYC_LABEL[profile.kycStatus] : "—"} />
              <Row label="Limite quotidienne" value={profile ? `${nfCad.format(profile.dailyLimitCad)} CAD` : "—"} />
              {profile?.interacQuestion && <Row label="Question Interac" value={profile.interacQuestion} />}
              {profile?.interacAnswer && <Row label="Réponse Interac" value={profile.interacAnswer} />}
            </div>

            {profile?.accountType === "business" && (
              <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card md:col-span-2">
                <div className="px-5 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Entreprise</p>
                </div>
                <div className="grid divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
                  <div className="divide-y divide-border">
                    <Row label="Raison sociale" value={profile.businessName} />
                    {profile.businessNumber && <Row label="NEQ / BN" value={profile.businessNumber} mono />}
                  </div>
                  <div className="divide-y divide-border">
                    {profile.businessAddress && <Row label="Adresse" value={profile.businessAddress} />}
                    {profile.businessPhone && <Row label="Téléphone" value={profile.businessPhone} />}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Résumé IA — carte au-dessus des autres pour un contexte immédiat. */}
          {profile && (
            <div style={{ ...card, padding: 16, fontFamily: FONT }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: aiSummary || aiError || aiBusy ? 12 : 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Wand2 style={{ width: 15, height: 15, color: C.t2 }} strokeWidth={1.7} />
                  <span style={sH}>Résumé assistant</span>
                </div>
                <button
                  type="button"
                  onClick={runSummary}
                  disabled={aiBusy}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    height: 30, padding: "0 12px", borderRadius: 8, border: `1px solid ${C.bd}`,
                    background: aiBusy ? C.l3 : "transparent",
                    color: aiBusy ? C.t3 : C.t1, fontSize: 12, fontFamily: FONT,
                    cursor: aiBusy ? "default" : "pointer",
                    transition: "border-color 0.12s, color 0.12s",
                  }}
                  onMouseEnter={(e) => { if (!aiBusy) { e.currentTarget.style.borderColor = C.accentBd; e.currentTarget.style.color = C.accent; } }}
                  onMouseLeave={(e) => { if (!aiBusy) { e.currentTarget.style.borderColor = C.bd; e.currentTarget.style.color = C.t1; } }}
                >
                  {aiBusy
                    ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />
                    : <Wand2 style={{ width: 13, height: 13 }} strokeWidth={1.7} />}
                  {aiBusy ? "Analyse…" : aiSummary ? "Régénérer" : "Résumer"}
                </button>
              </div>
              {aiError && (
                <div style={{
                  padding: "8px 12px", borderRadius: 8,
                  background: "rgba(200,60,60,0.10)", border: "1px solid rgba(200,60,60,0.3)",
                  color: "#f2c1c1", fontSize: 12, display: "flex", alignItems: "center", gap: 8,
                }}>
                  <AlertTriangle style={{ width: 13, height: 13 }} strokeWidth={2} />
                  {aiError}
                </div>
              )}
              {aiSummary && !aiError && (
                <div style={{
                  fontSize: 13.5, lineHeight: 1.65, color: C.t1,
                  whiteSpace: "pre-wrap",
                }}>
                  {aiSummary}
                </div>
              )}
              {!aiSummary && !aiError && !aiBusy && (
                <p style={{ fontSize: 12, color: C.t3, margin: 0, lineHeight: 1.5 }}>
                  Cliquez sur « Résumer » pour générer un aperçu du dossier en 4-6 puces (profil, volume, KYC, points d'attention).
                </p>
              )}
            </div>
          )}

          {/* Score de risque calculé — visible juste après l'identité */}
          {profile && <RiskScoreCard profile={profile} />}

          {/* Notes internes staff (localStorage V1) */}
          <ClientNotes userId={userId} />

          {/* Chronologie unifiée : inscription + KYC + commandes + notes */}
          {profile && <ClientTimeline profile={profile} orders={orders} userId={userId} />}

          {/* Historique des commandes */}
          <div>
            <p className="mb-2.5 px-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Historique des commandes ({orders.length})
            </p>
            <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {orders.length === 0 ? (
                <div className="py-10 text-center text-[13px] text-muted-foreground">
                  Aucune commande pour ce client.
                </div>
              ) : (
                orders.map((o) => {
                  const buy = o.side === "buy";
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => onOpenOrder?.(o.id)}
                      className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-secondary/30 active:bg-secondary/50"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground/70">
                        {buy
                          ? <Coins className="h-[18px] w-[18px]" strokeWidth={1.7} />
                          : <HandCoins className="h-[18px] w-[18px]" strokeWidth={1.7} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium">
                          {buy ? "Achat" : "Vente"} — {nfUsdt.format(o.usdtAmount)} USDT
                        </p>
                        <p className="truncate text-[12px] text-muted-foreground">
                          {orderRef(o.id)} · {STATUS_FR[o.status] ?? o.status}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[14px] font-semibold">{nf.format(o.cadAmount)} <span className="text-[12px] font-medium">CAD</span></p>
                        <p className="text-[11.5px] text-muted-foreground">
                          {dateFmtShort.format(new Date(o.createdAt))}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ClientProfile;
