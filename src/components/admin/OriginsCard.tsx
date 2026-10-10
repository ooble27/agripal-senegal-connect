import { useEffect, useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { T } from "@/lib/i18n";
import { fetchOrigins, regionName, countryName, type SignupOrigin } from "@/lib/origin";
import { C, card, cardHeader, sH, numeric } from "./adminTheme";

/*
 * Tableau de bord : d'où viennent les inscrits. Deux listes, lieux (province
 * au Canada, pays ailleurs, ou villes) et sources (Google, WhatsApp, lien de
 * campagne…), en part du total.
 */

type Tab = "regions" | "cities" | "sources";

function top(rows: SignupOrigin[], key: (o: SignupOrigin) => string | null, n = 6) {
  const counts = new Map<string, number>();
  for (const o of rows) {
    const k = key(o) ?? "Inconnu";
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

const OriginsCard = () => {
  const [rows, setRows] = useState<SignupOrigin[] | null>(null);
  const [tab, setTab] = useState<Tab>("regions");

  useEffect(() => { fetchOrigins().then(setRows); }, []);

  const list = useMemo(() => {
    if (!rows) return [];
    if (tab === "sources") return top(rows, (o) => o.source);
    if (tab === "cities") return top(rows, (o) => o.city);
    return top(rows, (o) => (o.country === "CA" ? regionName(o) : countryName(o.country)));
  }, [rows, tab]);
  const total = rows?.length ?? 0;

  const tabs: { id: Tab; fr: string; en: string }[] = [
    { id: "regions", fr: "Provinces", en: "Provinces" },
    { id: "cities", fr: "Villes", en: "Cities" },
    { id: "sources", fr: "Sources", en: "Sources" },
  ];

  return (
    <div style={card}>
      <div style={{ ...cardHeader, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <MapPin style={{ width: 12, height: 12, color: C.t3 }} />
          <span style={sH}><T en="Where signups come from">Origine des inscriptions</T></span>
        </div>
        <div role="group" aria-label="Vue" style={{ display: "inline-flex", gap: 2, padding: 2, borderRadius: 8, background: C.l3 }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                height: 24, padding: "0 9px", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11,
                background: tab === t.id ? C.l1 : "transparent", color: tab === t.id ? C.t1 : C.t3,
              }}
            >
              <T en={t.en}>{t.fr}</T>
            </button>
          ))}
        </div>
      </div>
      {!rows ? (
        <p style={{ fontSize: 12, color: C.t3, margin: 0, padding: "32px 20px", textAlign: "center" }}>…</p>
      ) : total === 0 ? (
        <p style={{ fontSize: 12, color: C.t3, margin: 0, padding: "32px 20px", textAlign: "center", lineHeight: 1.6 }}>
          <T en="No data yet: each new signup is recorded from now on.">
            Pas encore de données : chaque nouvelle inscription est enregistrée à partir de maintenant.
          </T>
        </p>
      ) : (
        <div style={{ padding: "14px 20px 18px", display: "flex", flexDirection: "column", gap: 11 }}>
          {list.map(([label, n]) => {
            const pct = (n / total) * 100;
            return (
              <div key={label} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5 }}>
                  <span style={{ color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
                  <span style={{ color: C.t3, ...numeric }}>{n} · {pct.toFixed(0)} %</span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: C.l3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.max(2, pct)}%`, background: C.accent, borderRadius: 99 }} />
                </div>
              </div>
            );
          })}
          <p style={{ margin: "4px 0 0", fontSize: 11, color: C.t3 }}>
            {total} <T en="signups with a known origin">inscriptions dont l'origine est connue</T>
          </p>
        </div>
      )}
    </div>
  );
};

export default OriginsCard;
