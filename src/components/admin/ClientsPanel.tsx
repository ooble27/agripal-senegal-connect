import { useEffect, useMemo, useState } from "react";
import { Download, Search, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { nfCad } from "@/lib/adminOrders";
import { regionName, countryName } from "@/lib/origin";
import AdminHero from "./AdminHero";
import { C, FONT, card, inputStyle, btnGhost, sH, numeric, listRowHoverIn, listRowHoverOut } from "./adminTheme";

/*
 * Back-office, onglet Clients : tous les inscrits, avec leur vérification,
 * leur lieu et leur source d'inscription, leurs commandes et leur dernière
 * connexion. Recherche, filtres, tri, export CSV ; un clic ouvre la fiche.
 * Données : fonction admin_clients (réservée à l'équipe).
 */

interface Client {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  account_type: string;
  business_name: string | null;
  kyc_status: string;
  business_status: string | null;
  created_at: string;
  closed_at: string | null;
  is_staff: boolean;
  orders: number;
  completed: number;
  volume_cad: number;
  last_order_at: string | null;
  last_sign_in_at: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  source: string | null;
  origin_late: boolean | null;
}

type Filter = "all" | "verified" | "pending" | "unverified" | "business" | "buyers" | "staff";
type Sort = "recent" | "volume" | "active" | "name";

const VERIF: Record<string, [string, string, string]> = {
  approved: ["Vérifiée", "var(--a-successBg)", "var(--a-successText)"],
  pending: ["En attente", "var(--a-warnBg)", "var(--a-warnText)"],
  rejected: ["Refusée", "var(--a-dangerBg)", "var(--a-dangerText)"],
  not_started: ["Non commencée", "var(--a-hover4)", "var(--a-t3)"],
};

const day = new Intl.DateTimeFormat("fr-CA", { day: "numeric", month: "short", year: "numeric" });
function ago(iso: string | null): string {
  if (!iso) return "Jamais";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `il y a ${Math.max(1, m)} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  return d < 60 ? `il y a ${d} j` : day.format(new Date(iso));
}
const initials = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
const nameOf = (c: Client) => (c.account_type === "business" && c.business_name ? c.business_name : c.full_name) || c.email || "Sans nom";
const verifOf = (c: Client) => (c.account_type === "business" ? c.business_status ?? "not_started" : c.kyc_status);
const sourceOf = (c: Client) =>
  c.source && !c.source.startsWith("Inconnue") ? c.source.charAt(0).toUpperCase() + c.source.slice(1) : null;
const placeOf = (c: Client) => {
  const reg = c.country === "CA" ? regionName({ country: c.country, region: c.region }) : countryName(c.country);
  return [c.city, reg].filter(Boolean).join(", ") || null;
};

function toCsv(rows: Client[]): string {
  const head = ["Nom", "Courriel", "Téléphone", "Type", "Vérification", "Ville", "Province / pays", "Source", "Commandes", "Terminées", "Volume CAD", "Inscription", "Dernière connexion"];
  const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((c) => [
    nameOf(c), c.email, c.phone, c.account_type === "business" ? "Entreprise" : "Particulier", VERIF[verifOf(c)]?.[0] ?? verifOf(c),
    c.city, c.country === "CA" ? regionName(c) : countryName(c.country), c.source, c.orders, c.completed, Number(c.volume_cad).toFixed(2),
    c.created_at.slice(0, 10), c.last_sign_in_at?.slice(0, 16).replace("T", " ") ?? "",
  ].map(q).join(","));
  return "﻿" + [head.map(q).join(","), ...lines].join("\n");
}

const PAGE = 60;

export default function ClientsPanel({ onOpen }: { onOpen: (userId: string, name: string) => void }) {
  const [rows, setRows] = useState<Client[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [region, setRegion] = useState("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    supabase.rpc("admin_clients" as never).then(({ data, error }) => {
      if (error) setErr(error.message);
      else setRows((data ?? []) as unknown as Client[]);
    });
  }, []);

  const all = rows ?? [];
  const clients = all.filter((c) => !c.is_staff);
  const weekAgo = Date.now() - 7 * 86400000;

  const filters: { id: Filter; label: string; test: (c: Client) => boolean }[] = [
    { id: "all", label: "Tous", test: (c) => !c.is_staff },
    { id: "verified", label: "Vérifiés", test: (c) => !c.is_staff && verifOf(c) === "approved" },
    { id: "pending", label: "En attente", test: (c) => !c.is_staff && verifOf(c) === "pending" },
    { id: "unverified", label: "Non vérifiés", test: (c) => !c.is_staff && ["not_started", "rejected"].includes(verifOf(c)) },
    { id: "business", label: "Entreprises", test: (c) => !c.is_staff && c.account_type === "business" },
    { id: "buyers", label: "Ont commandé", test: (c) => !c.is_staff && c.orders > 0 },
    { id: "staff", label: "Équipe", test: (c) => c.is_staff },
  ];

  const regions = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of all) {
      const key = c.country === "CA" ? `CA:${c.region ?? ""}` : c.country ? `X:${c.country}` : "";
      if (!key || m.has(key)) continue;
      m.set(key, c.country === "CA" ? (regionName(c) ?? "Canada") : (countryName(c.country) ?? c.country ?? ""));
    }
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], "fr"));
  }, [all]);

  const list = useMemo(() => {
    const f = filters.find((x) => x.id === filter)!.test;
    const needle = q.trim().toLowerCase();
    const out = all.filter(f).filter((c) => {
      if (region !== "all") {
        const key = c.country === "CA" ? `CA:${c.region ?? ""}` : c.country ? `X:${c.country}` : "";
        if (key !== region) return false;
      }
      if (!needle) return true;
      return [c.full_name, c.business_name, c.email, c.phone, c.city, c.source].some((v) => v?.toLowerCase().includes(needle));
    });
    const by: Record<Sort, (a: Client, b: Client) => number> = {
      recent: (a, b) => b.created_at.localeCompare(a.created_at),
      volume: (a, b) => Number(b.volume_cad) - Number(a.volume_cad) || b.orders - a.orders,
      active: (a, b) => (b.last_sign_in_at ?? "").localeCompare(a.last_sign_in_at ?? ""),
      name: (a, b) => nameOf(a).localeCompare(nameOf(b), "fr"),
    };
    return out.sort(by[sort]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, filter, region, q, sort]);

  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([toCsv(list)], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `ooble-clients-${new Date().toISOString().slice(0, 10)}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };

  const select: React.CSSProperties = { ...inputStyle, width: "auto", height: 36, padding: "0 10px", cursor: "pointer" };

  return (
    <div style={{ display: "grid", gap: 16, fontFamily: FONT }}>
      <AdminHero
        eyebrow="Clients"
        loading={!rows}
        value={clients.length}
        unit="inscrits"
        stats={rows ? [
          { label: "Vérifiés", value: clients.filter((c) => verifOf(c) === "approved").length },
          { label: "Ont commandé", value: clients.filter((c) => c.orders > 0).length },
          { label: "Cette semaine", value: clients.filter((c) => new Date(c.created_at).getTime() > weekAgo).length },
          { label: "Entreprises", value: clients.filter((c) => c.account_type === "business").length },
        ] : []}
      />

      {err && <p style={{ margin: 0, color: C.dangerText, fontSize: 13 }}>{err}</p>}

      {/* Barre d'outils */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <label style={{ ...inputStyle, flex: "1 1 260px", display: "flex", alignItems: "center", gap: 8, height: 36, padding: "0 12px" }}>
          <Search style={{ width: 14, height: 14, color: C.t3, flexShrink: 0 }} />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setShown(PAGE); }}
            placeholder="Nom, courriel, téléphone, ville, source"
            aria-label="Rechercher un client"
            style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", color: C.t1, font: "inherit", fontSize: 13 }}
          />
        </label>
        <select value={region} onChange={(e) => { setRegion(e.target.value); setShown(PAGE); }} aria-label="Province ou pays" style={{ ...select, flex: "1 1 auto" }}>
          <option value="all">Toutes les provinces et pays</option>
          {regions.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Trier" style={{ ...select, flex: "1 1 auto" }}>
          <option value="recent">Inscrits récemment</option>
          <option value="active">Connectés récemment</option>
          <option value="volume">Plus gros volume</option>
          <option value="name">Nom (A à Z)</option>
        </select>
        <button type="button" onClick={exportCsv} disabled={!rows} style={btnGhost}>
          <Download style={{ width: 13, height: 13 }} /> Exporter
        </button>
      </div>

      <div role="group" aria-label="Filtrer" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {filters.map((f) => {
          const on = f.id === filter;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => { setFilter(f.id); setShown(PAGE); }}
              style={{
                height: 30, padding: "0 12px", borderRadius: 99, cursor: "pointer", fontSize: 12, fontFamily: FONT,
                border: `1px solid ${on ? C.accent : C.bds}`, background: on ? C.accent : C.l1, color: on ? C.btnText : C.t2,
              }}
            >
              {f.label} <span style={{ opacity: 0.55, marginLeft: 3 }}>{all.filter(f.test).length}</span>
            </button>
          );
        })}
      </div>

      {/* Téléphone : une carte par client */}
      <div className="flex flex-col md:hidden" style={card}>
        {!rows ? (
          <p style={{ margin: 0, padding: "32px 16px", textAlign: "center", fontSize: 13, color: C.t3 }}>Chargement…</p>
        ) : list.length === 0 ? (
          <p style={{ margin: 0, padding: "32px 16px", textAlign: "center", fontSize: 13, color: C.t3 }}>Aucun client ne correspond.</p>
        ) : list.slice(0, shown).map((c, i) => {
          const v = VERIF[verifOf(c)] ?? VERIF.not_started;
          const name = nameOf(c);
          const meta = [placeOf(c), sourceOf(c)].filter(Boolean).join(" · ") || "Lieu et source inconnus";
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onOpen(c.id, name)}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", border: "none", textAlign: "left", cursor: "pointer",
                background: "transparent", color: C.t1, fontFamily: FONT, borderTop: i ? `1px solid ${C.bds}` : "none",
              }}
            >
              <span style={{
                width: 38, height: 38, borderRadius: 11, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center",
                background: C.hover4, border: `1px solid ${C.bds}`, fontSize: 12.5,
              }}>{initials(name)}</span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                  {c.is_staff && <span style={{ fontSize: 10, color: C.t3 }}>Équipe</span>}
                </span>
                <span style={{ fontSize: 12, color: C.t3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: C.t3 }}>
                  <span style={{ height: 20, padding: "0 8px", borderRadius: 99, display: "inline-flex", alignItems: "center", background: v[1], color: v[2] }}>{v[0]}</span>
                  {c.orders ? `${c.orders} commande${c.orders > 1 ? "s" : ""} · ${nfCad.format(Number(c.volume_cad))} $` : `Inscrit le ${day.format(new Date(c.created_at))}`}
                </span>
              </span>
              <ChevronRight style={{ width: 15, height: 15, color: C.t3, flexShrink: 0 }} />
            </button>
          );
        })}
        {rows && list.length > shown && (
          <button type="button" onClick={() => setShown((n) => n + PAGE)} style={{ ...btnGhost, margin: 12, justifyContent: "center" }}>
            Afficher plus ({list.length - shown} restants)
          </button>
        )}
      </div>

      {/* Ordinateur : tableau */}
      <div className="hidden md:block" style={card}>
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 980 }}>
            <div style={{
              display: "grid", gridTemplateColumns: "minmax(220px,1.6fr) minmax(150px,1fr) 130px 120px 130px 110px 120px 20px",
              gap: 12, padding: "11px 18px", borderBottom: `1px solid ${C.bds}`,
            }}>
              {["Client", "Lieu", "Source", "Vérification", "Commandes", "Inscription", "Connexion", ""].map((h) => (
                <span key={h} style={{ ...sH, fontSize: 10 }}>{h}</span>
              ))}
            </div>

            {!rows ? (
              <p style={{ margin: 0, padding: "40px 18px", textAlign: "center", fontSize: 13, color: C.t3 }}>Chargement…</p>
            ) : list.length === 0 ? (
              <p style={{ margin: 0, padding: "40px 18px", textAlign: "center", fontSize: 13, color: C.t3 }}>Aucun client ne correspond.</p>
            ) : list.slice(0, shown).map((c, i) => {
              const v = VERIF[verifOf(c)] ?? VERIF.not_started;
              const place = placeOf(c);
              const name = nameOf(c);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onOpen(c.id, name)}
                  onMouseEnter={(e) => listRowHoverIn(e.currentTarget)}
                  onMouseLeave={(e) => listRowHoverOut(e.currentTarget)}
                  style={{
                    width: "100%", display: "grid",
                    gridTemplateColumns: "minmax(220px,1.6fr) minmax(150px,1fr) 130px 120px 130px 110px 120px 20px",
                    gap: 12, alignItems: "center", padding: "12px 18px", border: "none", textAlign: "left", cursor: "pointer",
                    background: "transparent", color: C.t1, fontFamily: FONT,
                    borderBottom: i < Math.min(shown, list.length) - 1 ? `1px solid ${C.bds}` : "none",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                    <span style={{
                      width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center",
                      background: C.hover4, border: `1px solid ${C.bds}`, fontSize: 12, color: C.t1,
                    }}>{initials(name)}</span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5 }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                        {c.is_staff && <span style={{ fontSize: 10, color: C.t3, border: `1px solid ${C.bds}`, borderRadius: 6, padding: "1px 6px" }}>Équipe</span>}
                        {c.account_type === "business" && <span style={{ fontSize: 10, color: C.t3, border: `1px solid ${C.bds}`, borderRadius: 6, padding: "1px 6px" }}>Entreprise</span>}
                        {c.closed_at && <span style={{ fontSize: 10, color: C.dangerText, border: `1px solid ${C.dangerBd}`, borderRadius: 6, padding: "1px 6px" }}>Fermé</span>}
                      </span>
                      <span style={{ display: "block", fontSize: 11.5, color: C.t3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.email}</span>
                    </span>
                  </span>
                  <span style={{ fontSize: 12.5, color: place ? C.t2 : C.t3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.origin_late ? "Lieu d'une connexion, pas forcément de l'inscription" : undefined}>
                    {place ?? "Inconnu"}{c.origin_late && place ? " *" : ""}
                  </span>
                  <span style={{ fontSize: 12.5, color: C.t2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {sourceOf(c) ?? <span style={{ color: C.t3 }}>Inconnue</span>}
                  </span>
                  <span>
                    <span style={{ display: "inline-flex", alignItems: "center", height: 22, padding: "0 9px", borderRadius: 99, fontSize: 11, background: v[1], color: v[2] }}>{v[0]}</span>
                  </span>
                  <span style={{ fontSize: 12.5, ...numeric }}>
                    {c.orders ? <>{c.orders} <span style={{ color: C.t3 }}>· {nfCad.format(Number(c.volume_cad))} $</span></> : <span style={{ color: C.t3 }}>Aucune</span>}
                  </span>
                  <span style={{ fontSize: 12, color: C.t2 }}>{day.format(new Date(c.created_at))}</span>
                  <span style={{ fontSize: 12, color: C.t3 }}>{ago(c.last_sign_in_at)}</span>
                  <ChevronRight style={{ width: 14, height: 14, color: C.t3 }} />
                </button>
              );
            })}
          </div>
        </div>
        {rows && list.length > shown && (
          <div style={{ padding: 12, borderTop: `1px solid ${C.bds}`, textAlign: "center" }}>
            <button type="button" onClick={() => setShown((n) => n + PAGE)} style={btnGhost}>
              Afficher plus ({list.length - shown} restants)
            </button>
          </div>
        )}
      </div>
      <p style={{ margin: 0, fontSize: 11.5, color: C.t3 }}>
        {list.length} résultat{list.length > 1 ? "s" : ""}. * Lieu d'une connexion plus récente, l'inscription datant d'avant le suivi.
        Volume : commandes terminées.
      </p>
    </div>
  );
}
