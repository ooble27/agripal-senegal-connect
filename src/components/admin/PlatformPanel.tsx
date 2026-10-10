import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  C, FONT, card, cardHeaderRow, cardTitle, cardSubtitle, btnPrimary, btnGhost, inputStyle, sH, rowStyle,
} from "@/components/admin/adminTheme";

/*
 * Plateforme : réinitialiser les données de test, puis démarrer les
 * activités. Tant que la plateforme n'est pas lancée, tout ce qui est en base
 * vient des tests de l'équipe et peut être remis à zéro. Une fois lancée, la
 * réinitialisation est refusée pour toujours (dossiers clients : 5 ans).
 * Le travail est fait côté serveur (fonction edge reset-test-data).
 */

type Count = { table: string; label: string; n: number };
interface Preview {
  launchedAt: string | null;
  lastResetAt: string | null;
  core: Count[];
  mail: Count[];
  logs: Count[];
  clients: number;
  staff: string[];
  documents: number;
}
interface ResetResult { ok: boolean; clients: number; documents: number; tables: Record<string, number>; failed: string[] }

const KEPT = [
  "Comptes de l'équipe et leurs rôles",
  "Règlement auto : réglages, portefeuilles et soldes",
  "Trésorerie : adresses et soldes enregistrés",
  "Programme de conformité (liste des obligations)",
  "Historique des taux, domaines de courriel refusés",
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
  const total = p.core.reduce((t, c) => t + c.n, 0) + p.clients + p.documents;

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
                : "Tout ce qui est en base vient de vos tests et peut être remis à zéro."}
              {p.lastResetAt && ` Dernière réinitialisation : ${fmtDate(p.lastResetAt)}.`}
            </p>
          </div>
        </div>
      </div>

      {err && <p style={{ color: C.dangerText, fontSize: 13, margin: 0 }}>{err}</p>}

      {result && (
        <div style={{ ...card, padding: "16px 20px", borderColor: result.ok ? C.successBd : C.warnBd }}>
          <p style={{ ...cardTitle, color: result.ok ? C.successText : C.warnText }}>
            {result.ok ? "Réinitialisation terminée" : "Réinitialisation terminée, avec des comptes non supprimés"}
          </p>
          <p style={{ ...cardSubtitle, fontSize: 12 }}>
            {result.clients} comptes clients, {result.documents} documents et {Object.values(result.tables).reduce((a, b) => a + b, 0)} enregistrements effacés.
          </p>
          {result.failed.map((f) => <p key={f} style={{ fontSize: 12, color: C.warnText, margin: "6px 0 0" }}>{f}</p>)}
          <button type="button" style={{ ...btnGhost, marginTop: 12 }} onClick={() => window.location.reload()}>Recharger le back-office</button>
        </div>
      )}

      {!launched && (
        <div style={card}>
          <div style={cardHeaderRow}>
            <div>
              <p style={cardTitle}>Réinitialiser les données de test</p>
              <p style={cardSubtitle}>Repartir de zéro avant le lancement. Possible autant de fois que vous voulez.</p>
            </div>
          </div>

          <div style={{ padding: "16px 20px 4px" }}><p style={sH}>Sera effacé</p></div>
          <Line label="Comptes clients (tous sauf l'équipe)" n={p.clients} last={false} />
          {p.core.map((c) => <Line key={c.table} label={c.label} n={c.n} last={false} />)}
          <Line label="Documents d'identité (photos)" n={p.documents} last />

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
              <li>Comptes de l'équipe : {p.staff.join(", ")}</li>
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
                {busy ? "Réinitialisation…" : "Tout réinitialiser"}
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
            La plateforme est lancée. La réinitialisation n'est plus possible : chaque commande, vérification et déclaration fait
            partie du registre et se conserve au moins 5 ans (CANAFE).
          </p>
        ) : (
          <div style={{ padding: "16px 20px 20px" }}>
            <p style={{ margin: 0, fontSize: 13, color: C.t2, lineHeight: 1.6 }}>
              Une fois les activités démarrées, la réinitialisation disparaît pour toujours, et plus personne, serveur compris,
              ne peut effacer une commande payée ou une déclaration. Réinitialisez d'abord les données de test.
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
