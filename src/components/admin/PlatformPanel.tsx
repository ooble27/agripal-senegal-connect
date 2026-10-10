import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  C, FONT, card, cardHeaderRow, cardTitle, cardSubtitle, btnPrimary, btnGhost, inputStyle, sH, rowStyle,
} from "@/components/admin/adminTheme";

/*
 * Plateforme : réinitialiser les commandes de test, puis démarrer les
 * activités. Seules les commandes et ce qui s'y rattache sont effacés ;
 * comptes clients, vérifications et registre de conformité ne sont jamais
 * touchés. Une fois la plateforme lancée, plus de réinitialisation.
 * Le travail est fait côté serveur (fonction edge reset-test-data).
 */

type Count = { table: string; label: string; n: number };
interface Preview {
  launchedAt: string | null;
  lastResetAt: string | null;
  core: Count[];
  mail: Count[];
  logs: Count[];
  keptOrders: number;
}
interface ResetResult { ok: boolean; tables: Record<string, number>; keptOrders: number }

const KEPT = [
  "Tous les comptes clients : ils restent inscrits",
  "Vérifications d'identité et d'entreprise, avec leurs documents",
  "Destinataires enregistrés des clients",
  "Registre de conformité (alertes, déclarations), et les commandes qu'il cite",
  "Comptes de l'équipe et leurs rôles",
  "Règlement auto : réglages, portefeuilles et soldes",
  "Trésorerie, programme de conformité, historique des taux",
];

const fmtDate = (s: string) => new Date(s).toLocaleString("fr-CA", { dateStyle: "long", timeStyle: "short" });
const plain = (s: string) => s.trim().toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("reset-test-data", { body });
  if (error) {
    const res = (error as { context?: Response }).context;
    const detail = res ? await res.json().catch(() => null) : null;
    throw new Error(detail?.message ?? detail?.error ?? error.message);
  }
  return data as T;
}

const Line = ({ label, n, last }: { label: string; n: number; last: boolean }) => (
  <div style={{ ...rowStyle(last), display: "flex", justifyContent: "space-between", fontSize: 13, color: n ? C.t1 : C.t3 }}>
    <span>{label}</span>
    <span style={{ fontVariantNumeric: "tabular-nums" }}>{n}</span>
  </div>
);

const Check = ({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint: string }) => (
  <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", padding: "10px 0" }}>
    <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} style={{ marginTop: 3, accentColor: "currentColor" }} />
    <span>
      <span style={{ display: "block", fontSize: 13, color: C.t1 }}>{label}</span>
      <span style={{ display: "block", fontSize: 12, color: C.t3, marginTop: 2 }}>{hint}</span>
    </span>
  </label>
);

export default function PlatformPanel() {
  const [p, setP] = useState<Preview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [mail, setMail] = useState(true);
  const [logs, setLogs] = useState(true);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ResetResult | null>(null);
  const [launchTyped, setLaunchTyped] = useState("");

  const load = useCallback(() => {
    setErr(null);
    call<Preview>({ action: "preview" }).then(setP).catch((e) => setErr(e.message));
  }, []);
  useEffect(load, [load]);

  const reset = async () => {
    if (plain(typed) !== "REINITIALISER" || busy) return;
    setBusy(true); setErr(null);
    try {
      const r = await call<ResetResult>({ action: "reset", confirm: typed, mail, logs });
      setResult(r); setTyped(""); load();
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };

  const launch = async () => {
    if (plain(launchTyped) !== "DEMARRER" || busy) return;
    setBusy(true); setErr(null);
    try { await call({ action: "launch", confirm: launchTyped }); setLaunchTyped(""); load(); }
    catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };

  if (!p) {
    return <p style={{ color: err ? C.dangerText : C.t3, fontSize: 13, fontFamily: FONT }}>{err ?? "Chargement…"}</p>;
  }

  const launched = !!p.launchedAt;
  const total = [...p.core, ...(mail ? p.mail : []), ...(logs ? p.logs : [])].reduce((t, c) => t + c.n, 0);

  return (
    <div style={{ display: "grid", gap: 18, maxWidth: 760, fontFamily: FONT }}>
      {/* État */}
      <div style={card}>
        <div style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ width: 10, height: 10, borderRadius: 99, background: launched ? C.successText : C.warnText, flexShrink: 0 }} />
          <div>
            <p style={{ ...cardTitle, fontSize: 15 }}>{launched ? "Activités démarrées" : "Plateforme en test"}</p>
            <p style={{ ...cardSubtitle, fontSize: 12 }}>
              {launched
                ? `Depuis le ${fmtDate(p.launchedAt!)}. Les dossiers clients se conservent au moins 5 ans.`
                : "Les commandes passées jusqu'ici sont des tests et peuvent être remises à zéro."}
              {p.lastResetAt && ` Dernière réinitialisation : ${fmtDate(p.lastResetAt)}.`}
            </p>
          </div>
        </div>
      </div>

      {err && <p style={{ color: C.dangerText, fontSize: 13, margin: 0 }}>{err}</p>}

      {result && (
        <div style={{ ...card, padding: "16px 20px", borderColor: result.ok ? C.successBd : C.warnBd }}>
          <p style={{ ...cardTitle, color: result.ok ? C.successText : C.warnText }}>
            Réinitialisation terminée
          </p>
          <p style={{ ...cardSubtitle, fontSize: 12 }}>
            {result.tables.orders ?? 0} commandes et {Object.values(result.tables).reduce((a, b) => a + b, 0)} enregistrements effacés.
            {result.keptOrders > 0 && ` ${result.keptOrders} commande(s) gardée(s) : citée(s) par le registre de conformité.`}
          </p>
          <button type="button" style={{ ...btnGhost, marginTop: 12 }} onClick={() => window.location.reload()}>Recharger le back-office</button>
        </div>
      )}

      {!launched && (
        <div style={card}>
          <div style={cardHeaderRow}>
            <div>
              <p style={cardTitle}>Réinitialiser les commandes de test</p>
              <p style={cardSubtitle}>Repartir de zéro avant le lancement. Les comptes et vérifications restent. Possible autant de fois que vous voulez.</p>
            </div>
          </div>

          <div style={{ padding: "16px 20px 4px" }}><p style={sH}>Sera effacé</p></div>
          {p.core.map((c, i) => <Line key={c.table} label={c.label} n={c.n} last={i === p.core.length - 1} />)}

          <div style={{ padding: "14px 20px 0", borderTop: `1px solid ${C.bds}` }}>
            <p style={sH}>En option</p>
            <Check on={mail} onChange={setMail} label={`Messagerie (${p.mail.reduce((t, c) => t + c.n, 0)} conversations)`}
              hint="Courriels reçus et envoyés depuis le back-office. Décochez si certains viennent de vrais contacts." />
            <Check on={logs} onChange={setLogs} label={`Journaux (${p.logs.reduce((t, c) => t + c.n, 0)} entrées)`}
              hint="Journal d'activité de l'équipe et questions posées à l'assistant IA." />
          </div>

          <div style={{ padding: "14px 20px 0", borderTop: `1px solid ${C.bds}` }}>
            <p style={sH}>Toujours gardé</p>
            <ul style={{ margin: "10px 0 0", paddingLeft: 18, color: C.t2, fontSize: 12.5, lineHeight: 1.9 }}>
              {KEPT.map((k) => <li key={k}>{k}</li>)}
            </ul>
          </div>

          <div style={{ padding: "18px 20px 20px", marginTop: 14, borderTop: `1px solid ${C.bds}` }}>
            <label htmlFor="reset-confirm" style={{ fontSize: 12.5, color: C.t2 }}>
              Pour confirmer, tapez <strong style={{ color: C.t1, fontWeight: 500 }}>RÉINITIALISER</strong>. Cette action ne peut pas être annulée.
            </label>
            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <input id="reset-confirm" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="RÉINITIALISER"
                autoComplete="off" style={{ ...inputStyle, flex: "1 1 220px", letterSpacing: "0.08em" }} />
              <button type="button" onClick={reset} disabled={plain(typed) !== "REINITIALISER" || busy || total === 0}
                style={{ ...btnPrimary, background: C.dangerText, color: "#fff", opacity: plain(typed) !== "REINITIALISER" || busy || total === 0 ? 0.4 : 1 }}>
                {busy ? "Réinitialisation…" : "Réinitialiser les commandes"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={card}>
        <div style={cardHeaderRow}>
          <div>
            <p style={cardTitle}>Démarrer les activités</p>
            <p style={cardSubtitle}>À faire une seule fois, le jour où les vrais clients arrivent.</p>
          </div>
        </div>
        {launched ? (
          <p style={{ padding: "16px 20px", margin: 0, fontSize: 13, color: C.t2 }}>
            La plateforme est lancée. La réinitialisation n'est plus possible : chaque commande fait partie du registre des
            opérations et se conserve au moins 5 ans (CANAFE).
          </p>
        ) : (
          <div style={{ padding: "16px 20px 20px" }}>
            <p style={{ margin: 0, fontSize: 13, color: C.t2, lineHeight: 1.6 }}>
              Une fois les activités démarrées, la réinitialisation disparaît pour toujours, et plus personne, serveur compris,
              ne peut effacer une commande payée. Réinitialisez d'abord les commandes de test.
            </p>
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <input value={launchTyped} onChange={(e) => setLaunchTyped(e.target.value)} placeholder="DÉMARRER" aria-label="Tapez DÉMARRER pour confirmer"
                autoComplete="off" style={{ ...inputStyle, flex: "1 1 220px", letterSpacing: "0.08em" }} />
              <button type="button" onClick={launch} disabled={plain(launchTyped) !== "DEMARRER" || busy}
                style={{ ...btnPrimary, opacity: plain(launchTyped) !== "DEMARRER" || busy ? 0.4 : 1 }}>
                Démarrer les activités
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
