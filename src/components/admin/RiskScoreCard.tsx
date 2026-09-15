/**
 * Carte score de risque affichée dans la fiche client.
 *
 * Grand chiffre 0-100 aligné sur la typo Terex (Poppins Light), niveau
 * bilingue, jauge fine sous le nombre, puis liste explicite des facteurs
 * qui ont contribué. Aucune couleur criarde : la sévérité passe uniquement
 * par la position du curseur et par la teinte du fond blanc (0 % → 100 %
 * d'opacité). Rien de vert, rien de rouge — cohérent avec le reste du
 * back-office monochrome.
 */
import { useMemo, useState } from "react";
import { ChevronDown, ShieldAlert } from "lucide-react";
import { assessClient, RISK_LEVEL, type RiskLevel } from "@/lib/riskScore";
import type { ClientProfile } from "@/lib/adminClient";
import { C, FONT, card, cardHeader, sH } from "./adminTheme";

/** Étiquette courte du niveau, à côté du grand chiffre. */
const LEVEL_LABEL: Record<RiskLevel, string> = {
  low:      "Faible",
  medium:   "Modéré",
  high:     "Élevé",
  critical: "Très élevé",
};

const RiskScoreCard = ({ profile }: { profile: ClientProfile }) => {
  const assessment = useMemo(() => assessClient(profile), [profile]);
  const [expanded, setExpanded] = useState(false);

  const gaugePct = Math.max(2, assessment.score);
  const levelLabel = LEVEL_LABEL[assessment.level];

  return (
    <div style={{ ...card, fontFamily: FONT }}>
      <div style={{
        ...cardHeader,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ShieldAlert style={{ width: 12, height: 12, color: C.t3 }} strokeWidth={1.7} />
          <span style={sH}>Score de risque</span>
        </div>
        <span style={{
          fontSize: 10.5, color: C.t2,
          letterSpacing: "0.14em", textTransform: "uppercase",
        }}>
          v1
        </span>
      </div>

      {/* Grand chiffre + niveau */}
      <div style={{ padding: "22px 20px 16px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <p style={{
            fontFamily: FONT,
            fontVariantNumeric: "tabular-nums",
            fontSize: 52,
            fontWeight: 300,
            letterSpacing: "-0.03em",
            lineHeight: 1,
            color: C.t1,
            margin: 0,
          }}>
            {assessment.score}
            <span style={{ color: C.t3, fontSize: 18, marginLeft: 8, letterSpacing: 0 }}>/ 100</span>
          </p>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "5px 12px", borderRadius: 999,
            background: C.accentSoft, border: `1px solid ${C.accentBd}`,
            color: C.t1, fontSize: 11.5,
            letterSpacing: "0.04em",
          }}>
            {levelLabel}
          </span>
        </div>

        {/* Jauge horizontale */}
        <div style={{
          marginTop: 14, height: 3, background: C.l3, borderRadius: 2, overflow: "hidden",
        }}>
          <div style={{
            height: "100%", width: `${gaugePct}%`,
            background: C.accent, transition: "width 0.4s ease-out",
          }} />
        </div>

        {/* Repères de bandes */}
        <div style={{
          marginTop: 8, display: "flex", justifyContent: "space-between",
          fontSize: 10, color: C.t3, letterSpacing: "0.04em",
        }}>
          <span>0</span>
          <span>30</span>
          <span>60</span>
          <span>85</span>
          <span>100</span>
        </div>
      </div>

      {/* Toggle facteurs */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%",
          padding: "12px 20px",
          background: "transparent",
          border: "none",
          borderTop: `1px solid ${C.bds}`,
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          color: C.t2, fontSize: 12, fontFamily: FONT,
          transition: "background 0.12s, color 0.12s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.015)";
          e.currentTarget.style.color = C.t1;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = C.t2;
        }}
      >
        <span>
          {expanded ? "Masquer" : "Voir"} les {assessment.factors.length} facteurs
        </span>
        <ChevronDown style={{
          width: 14, height: 14,
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.15s",
        }} />
      </button>

      {expanded && (
        <div>
          {assessment.factors.map((f, i) => (
            <div key={f.label} style={{
              padding: "12px 20px",
              borderTop: `1px solid ${C.bds}`,
            }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 4,
              }}>
                <span style={{ fontSize: 13, color: C.t1 }}>{f.label}</span>
                <span style={{
                  fontFamily: FONT, fontVariantNumeric: "tabular-nums",
                  fontSize: 13, color: f.delta > 0 ? C.t1 : C.t3,
                }}>
                  {f.delta > 0 ? "+" : ""}{f.delta}
                </span>
              </div>
              <p style={{
                fontSize: 11.5, color: C.t3, margin: 0, lineHeight: 1.5,
              }}>
                {f.hint}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Note bas de carte */}
      <div style={{
        padding: "10px 20px",
        borderTop: `1px solid ${C.bds}`,
        fontSize: 10.5, color: C.t3, lineHeight: 1.5,
      }}>
        Calculé à partir du statut KYC, du volume cumulé et du type de compte.
        La V2 ajoutera PPV, pays de résidence et résultat de screening sanctions.
      </div>
    </div>
  );
};

export default RiskScoreCard;
