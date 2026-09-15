/**
 * Tableau de bord KPI du back-office Ooble.
 *
 * Design monochrome sombre inspiré du back-office Terex : fond `#1a1a1a`,
 * cartes `#212121`, séparateurs subtils, texte en trois niveaux de gris.
 *
 * Typographie : Poppins partout (la police de la plateforme), les chiffres
 * s'alignent via `tabular-nums` sans changer de famille. Aucun accent coloré
 * (vert/rouge/orange) : les tendances sont de simples flèches monochromes.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  TrendingUp, TrendingDown, Send,
  Users2, ShieldCheck, ClipboardList,
} from "lucide-react";
import { T } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { nfCad, nfUsdt, type AdminOrder } from "@/lib/adminOrders";
import {
  getVolumeMetrics, getMarginMetrics, getOrderStatusCounts,
  getCustomerFunnel, getComplianceAlertsCount, getPendingActionsCount,
  type VolumeMetrics, type MarginMetrics, type OrderStatusCounts,
  type CustomerFunnel, type ComplianceAlertsCount,
} from "@/lib/kpi";
import {
  C, FONT, card, sH, cardHeader, numeric, heroNumber, heroUnit,
  listRowStyle, listRowHoverIn, listRowHoverOut, pillSmall,
} from "./adminTheme";
import AdminHero from "./AdminHero";

interface KpiDashboardProps {
  orders: AdminOrder[];
  onNavigate?: (target: "queue" | "orders" | "compliance") => void;
}

type Period = 1 | 7 | 30;

const PERIOD_LABELS: Record<Period, { fr: string; en: string }> = {
  1:  { fr: "24 h", en: "24h" },
  7:  { fr: "7 j",  en: "7d"  },
  30: { fr: "30 j", en: "30d" },
};

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

const compact = (n: number): string =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} M`
  : n >= 10_000  ? `${(n / 1000).toFixed(1)} k`
  : nfCad.format(n);

const signedPct = (p: number | null): string | null => {
  if (p === null || !Number.isFinite(p)) return null;
  const sign = p >= 0 ? "+" : "";
  return `${sign}${p.toFixed(1)} %`;
};

// ────────────────────────────────────────────────────────────
// Blocs UI
// ────────────────────────────────────────────────────────────

function Trend({ value }: { value: number | null }) {
  const txt = signedPct(value);
  if (txt === null || value === null || value === 0) return null;
  const Icon = value > 0 ? TrendingUp : TrendingDown;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 11, color: C.t2, ...numeric,
    }}>
      <Icon style={{ width: 11, height: 11 }} strokeWidth={2} />
      {txt}
    </span>
  );
}

interface StatTileProps {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  trend?: number | null;
  onClick?: () => void;
}

function StatTile({ label, value, sub, trend, onClick }: StatTileProps) {
  const clickable = !!onClick;
  return (
    <button
      onClick={onClick}
      disabled={!clickable}
      style={{
        ...card,
        padding: "16px 18px",
        textAlign: "left",
        cursor: clickable ? "pointer" : "default",
        fontFamily: FONT,
        transition: "border-color 0.15s, background 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!clickable) return;
        (e.currentTarget as HTMLButtonElement).style.borderColor = C.bdh;
      }}
      onMouseLeave={(e) => {
        if (!clickable) return;
        (e.currentTarget as HTMLButtonElement).style.borderColor = C.bds;
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ ...sH, fontSize: 10 }}>{label}</span>
        {typeof trend === "number" && <Trend value={trend} />}
      </div>
      <p style={{
        marginTop: 8, marginBottom: 0,
        ...numeric, fontSize: 26, fontWeight: 300, color: C.t1,
        letterSpacing: "-0.02em", lineHeight: 1,
      }}>
        {value}
      </p>
      {sub && (
        <p style={{ marginTop: 6, marginBottom: 0, fontSize: 11, color: C.t3, lineHeight: 1.4 }}>
          {sub}
        </p>
      )}
    </button>
  );
}

function SkeletonTile() {
  return (
    <div style={{ ...card, padding: "16px 18px" }}>
      <div style={{ height: 10, width: "40%", background: C.l3, borderRadius: 3 }} />
      <div style={{ marginTop: 12, height: 26, width: "60%", background: C.l3, borderRadius: 4 }} />
      <div style={{ marginTop: 8, height: 10, width: "70%", background: C.l3, borderRadius: 3 }} />
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Sélecteur de période — segmented dark
// ────────────────────────────────────────────────────────────

function PeriodSwitcher({ value, onChange }: { value: Period; onChange: (v: Period) => void }) {
  const periods: Period[] = [1, 7, 30];
  return (
    <div style={{ display: "inline-flex", gap: 4 }}>
      {periods.map((p) => (
        <button key={p} onClick={() => onChange(p)} style={pillSmall(value === p)}>
          {PERIOD_LABELS[p].fr}
        </button>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Composant principal
// ────────────────────────────────────────────────────────────

const KpiDashboard = ({ orders, onNavigate }: KpiDashboardProps) => {
  const [period, setPeriod] = useState<Period>(7);
  const [loading, setLoading] = useState(true);
  const [volume, setVolume] = useState<VolumeMetrics | null>(null);
  const [margin, setMargin] = useState<MarginMetrics | null>(null);
  const [statuses, setStatuses] = useState<OrderStatusCounts | null>(null);
  const [pending, setPending] = useState(0);
  const [funnel, setFunnel] = useState<CustomerFunnel | null>(null);

  const complianceCount: ComplianceAlertsCount = useMemo(
    () => getComplianceAlertsCount(orders),
    [orders],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const [v, m, s, p, f] = await Promise.all([
      getVolumeMetrics({ periodDays: period }),
      getMarginMetrics({ periodDays: period }),
      getOrderStatusCounts(),
      getPendingActionsCount(),
      getCustomerFunnel(),
    ]);
    setVolume(v);
    setMargin(m);
    setStatuses(s);
    setPending(p);
    setFunnel(f);
    setLoading(false);
  }, [period]);

  useEffect(() => { void load(); }, [load]);

  // Live refresh via subscription.
  useEffect(() => {
    const channel = supabase
      .channel("kpi-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const periodLabel = PERIOD_LABELS[period].fr;
  const today = new Date().toLocaleDateString("fr-CA", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div style={{ fontFamily: FONT, color: C.t1 }}>

      {/* ══════════════════ En-tête ══════════════════ */}
      <div style={{
        display: "flex", alignItems: "flex-end", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12, marginBottom: 18,
      }}>
        <div>
          <p style={{ ...sH, marginBottom: 6 }}><T en="Overview">Vue d'ensemble</T></p>
          <h2 style={{
            fontSize: 24, fontWeight: 400, color: C.t1, margin: 0,
            letterSpacing: "-0.02em", lineHeight: 1.1,
          }}>
            <T en={`Business snapshot · ${periodLabel}`}>{`Activité · ${periodLabel}`}</T>
          </h2>
          <p style={{ fontSize: 12, color: C.t3, margin: "6px 0 0", textTransform: "capitalize" }}>
            {today}
          </p>
        </div>
        <PeriodSwitcher value={period} onChange={setPeriod} />
      </div>

      {/* ══════════════════ Grille principale ══════════════════ */}
      {/* Grille en classes Tailwind uniquement : un `gridTemplateColumns`
          inline écraserait la variante `lg:` et la 2ᵉ colonne ne sortirait
          jamais. */}
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[3fr_2fr] lg:items-start">

        {/* ─── Colonne gauche : héro + tuiles + graphique ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Héro — volume total */}
          <AdminHero
            eyebrow={<T en={`Volume · last ${periodLabel}`}>{`Volume · ${periodLabel}`}</T>}
            loading={loading || !volume}
            value={volume ? compact(volume.totalCad) : "—"}
            unit="CAD"
            stats={volume ? [
              { label: "USDT", value: nfUsdt.format(volume.totalUsdt) },
              { label: <T en="Orders">Commandes</T>, value: volume.count },
              {
                label: <T en="Variation">Variation</T>,
                value: signedPct(volume.changePct) ?? "—",
              },
            ] : []}
            actions={[
              {
                label: <T en="All orders">Toutes les commandes</T>,
                icon: ClipboardList,
                onClick: () => onNavigate?.("orders"),
              },
              {
                label: <T en="Open queue">File d'attente</T>,
                icon: Send,
                primary: true,
                onClick: () => onNavigate?.("queue"),
              },
            ]}
          />

          {/* Tuiles KPI secondaires */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {loading || !volume || !margin ? (
              <>
                <SkeletonTile />
                <SkeletonTile />
              </>
            ) : (
              <>
                <StatTile
                  label={<T en="Buy volume">Volume achats</T>}
                  value={<>{compact(volume.period.buyCad)} <span style={{ color: C.t3, fontSize: 14, fontWeight: 400 }}>CAD</span></>}
                  sub={<T en={`${volume.period.buyCount} orders`}>{`${volume.period.buyCount} commande${volume.period.buyCount > 1 ? "s" : ""}`}</T>}
                />
                <StatTile
                  label={<T en="Sell volume">Volume ventes</T>}
                  value={<>{compact(volume.period.sellCad)} <span style={{ color: C.t3, fontSize: 14, fontWeight: 400 }}>CAD</span></>}
                  sub={<T en={`${volume.period.sellCount} orders`}>{`${volume.period.sellCount} commande${volume.period.sellCount > 1 ? "s" : ""}`}</T>}
                />
              </>
            )}
          </div>

          {/* Marge + Taux en deux tuiles côte à côte */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {loading || !margin ? (
              <>
                <SkeletonTile />
                <SkeletonTile />
              </>
            ) : (
              <>
                <StatTile
                  label={<T en="Gross margin">Marge brute</T>}
                  value={<>{compact(margin.marginCad)} <span style={{ color: C.t3, fontSize: 14, fontWeight: 400 }}>CAD</span></>}
                  sub={<T en={`${margin.completedCount} completed · 2% markup`}>{`${margin.completedCount} terminée${margin.completedCount > 1 ? "s" : ""} · marge 2 %`}</T>}
                  trend={margin.changePct}
                />
                <StatTile
                  label={<T en="Pending actions">À traiter</T>}
                  value={pending}
                  sub={<T en="orders needing action">commandes en attente</T>}
                  onClick={() => onNavigate?.("queue")}
                />
              </>
            )}
          </div>
        </div>

        {/* ─── Colonne droite : marge + statuts + funnel + conformité ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Statuts */}
          <div style={card}>
            <div style={cardHeader}>
              <span style={sH}><T en="By status">Par statut</T></span>
            </div>
            {loading || !statuses ? (
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <p style={{ fontSize: 12, color: C.t3, margin: 0 }}>—</p>
              </div>
            ) : (() => {
              const rows: Array<{ label: string; en: string; count: number }> = [
                { label: "En attente",        en: "Awaiting",     count: statuses.awaiting_payment + statuses.created },
                { label: "Paiement reçu",     en: "Paid",         count: statuses.payment_received },
                { label: "En traitement",     en: "Processing",   count: statuses.settling },
                { label: "Terminées",         en: "Completed",    count: statuses.completed },
                { label: "Annulées / expirées", en: "Cancelled / expired", count: statuses.cancelled + statuses.expired },
              ];
              return rows.map((r, i) => (
                <div
                  key={r.label}
                  style={{ ...listRowStyle(i === rows.length - 1), justifyContent: "space-between" }}
                  onMouseEnter={(e) => listRowHoverIn(e.currentTarget)}
                  onMouseLeave={(e) => listRowHoverOut(e.currentTarget)}
                >
                  <span style={{ fontSize: 12.5, color: C.t2 }}><T en={r.en}>{r.label}</T></span>
                  <span style={{ fontSize: 13, fontWeight: 400, color: C.t1, ...numeric }}>
                    {r.count}
                  </span>
                </div>
              ));
            })()}
          </div>

          {/* Conformité */}
          <StatTile
            label={<><ShieldCheck style={{ width: 11, height: 11, display: "inline", verticalAlign: "-1px", marginRight: 6 }} /><T en="Compliance">Conformité</T></>}
            value={complianceCount.open}
            sub={<T en="unresolved alerts">alertes non résolues</T>}
            onClick={() => onNavigate?.("compliance")}
          />

          {/* Funnel clients */}
          <div style={card}>
            <div style={cardHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Users2 style={{ width: 12, height: 12, color: C.t3 }} />
                <span style={sH}><T en="Customer funnel">Entonnoir client</T></span>
              </div>
            </div>
            {loading || !funnel ? (
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <p style={{ fontSize: 12, color: C.t3, margin: 0 }}>—</p>
              </div>
            ) : (() => {
              const steps: Array<{ label: string; en: string; count: number }> = [
                { label: "Inscriptions",       en: "Signups",      count: funnel.total },
                { label: "KYC vérifié",        en: "KYC verified", count: funnel.verified },
                { label: "1er ordre",          en: "First order",  count: funnel.firstOrder },
                { label: "Clients récurrents", en: "Repeat",       count: funnel.repeat },
              ];
              const base = steps[0].count || 1;
              return (
                <div style={{ padding: "18px 20px 20px" }}>
                  {steps.map((s, i) => {
                    const pctFromBase = (s.count / base) * 100;
                    const prev = i === 0 ? null : steps[i - 1].count;
                    const conversion = prev != null && prev > 0 ? (s.count / prev) * 100 : null;
                    return (
                      <div key={s.label} style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        columnGap: 14,
                        alignItems: "baseline",
                        marginTop: i === 0 ? 0 : 14,
                      }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ fontSize: 12.5, color: C.t1 }}>
                              <T en={s.en}>{s.label}</T>
                            </span>
                            {conversion !== null && (
                              <span style={{
                                fontSize: 10.5, color: C.t3,
                                letterSpacing: "0.06em",
                                ...numeric,
                              }}>
                                {conversion.toFixed(0)} % ↓
                              </span>
                            )}
                          </div>
                          <div style={{
                            position: "relative", height: 26, background: C.l3,
                            borderRadius: 4, overflow: "hidden",
                          }}>
                            <div style={{
                              position: "absolute", inset: 0,
                              width: `${Math.max(2, pctFromBase)}%`,
                              background: C.accent,
                              transition: "width 0.5s cubic-bezier(0.22,1,0.36,1)",
                            }} />
                            <span style={{
                              position: "absolute", left: 10, top: "50%",
                              transform: "translateY(-50%)",
                              fontSize: 11, color: "#111",
                              mixBlendMode: "difference",
                              filter: "invert(1)",
                              ...numeric,
                            }}>
                              {pctFromBase.toFixed(0)} %
                            </span>
                          </div>
                        </div>
                        <span style={{
                          ...numeric,
                          fontSize: 20, fontWeight: 300, color: C.t1,
                          letterSpacing: "-0.02em", lineHeight: 1,
                          minWidth: 44, textAlign: "right",
                        }}>
                          {s.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

        </div>
      </div>

      {/* Note bas de page */}
      <p style={{
        marginTop: 18, fontSize: 11, color: C.t3, textAlign: "center", fontFamily: FONT,
      }}>
        <T en="Live · updates automatically when orders or profiles change.">
          En direct · se met à jour automatiquement à chaque changement de commande ou de client.
        </T>
      </p>
    </div>
  );
};

export default KpiDashboard;
