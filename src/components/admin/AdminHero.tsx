/**
 * Héro partagé du back-office.
 *
 * Un seul composant pour toutes les sections : même carte, même typographie,
 * mêmes séparateurs. Poppins Light pour le grand nombre (comme
 * `font-display font-light` dans l'app connectée), `tabular-nums` pour que
 * les chiffres restent alignés sans changer de famille de police.
 *
 * Le héro ne prend jamais toute la largeur de la page : il vit dans une
 * colonne (`maxWidth` par défaut) pour garder une mise en page respirante,
 * comme le back-office Terex où le héro occupe la colonne de gauche.
 */
import { C, FONT, heroCard, heroNumber, heroUnit, sH } from "./adminTheme";

export interface HeroStat {
  /** Libellé court, rendu en petites capitales. */
  label: React.ReactNode;
  /** Valeur — nombre ou texte court. */
  value: React.ReactNode;
  /** Détail optionnel affiché en plus discret à côté de la valeur. */
  hint?: React.ReactNode;
}

export interface HeroAction {
  label: React.ReactNode;
  icon?: React.ElementType;
  onClick?: () => void;
  /** `true` = bouton plein blanc, `false`/absent = contour discret. */
  primary?: boolean;
}

interface AdminHeroProps {
  /** Petit label au-dessus du grand nombre. */
  eyebrow: React.ReactNode;
  /** Le grand nombre (ou texte) mis en avant. */
  value: React.ReactNode;
  /** Unité accolée au grand nombre (CAD, USDT, « entrées »…). */
  unit?: React.ReactNode;
  /** Statistiques secondaires, séparées par des filets verticaux. */
  stats?: HeroStat[];
  /** Boutons d'action en bas du héro. */
  actions?: HeroAction[];
  /** Taille du grand nombre (40 par défaut). */
  size?: number;
  /** Affiché à la place du nombre pendant le chargement. */
  loading?: boolean;
}

function ActionButton({ action }: { action: HeroAction }) {
  const { label, icon: Icon, onClick, primary } = action;
  const base: React.CSSProperties = {
    height: 36,
    paddingLeft: primary ? 18 : 16,
    paddingRight: primary ? 18 : 16,
    borderRadius: 9,
    fontSize: 12,
    fontWeight: 400,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontFamily: FONT,
    whiteSpace: "nowrap",
    transition: "all 0.15s",
  };
  const style: React.CSSProperties = primary
    ? { ...base, background: C.accent, border: "none", color: "#111" }
    : { ...base, background: "transparent", border: `1px solid ${C.bd}`, color: C.t2 };

  return (
    <button
      onClick={onClick}
      style={style}
      onMouseEnter={(e) => {
        if (primary) e.currentTarget.style.background = C.accentHover;
        else { e.currentTarget.style.borderColor = C.accentBd; e.currentTarget.style.color = C.accent; }
      }}
      onMouseLeave={(e) => {
        if (primary) e.currentTarget.style.background = C.accent;
        else { e.currentTarget.style.borderColor = C.bd; e.currentTarget.style.color = C.t2; }
      }}
    >
      {Icon && <Icon style={{ width: 13, height: 13 }} strokeWidth={1.9} />}
      {label}
    </button>
  );
}

const AdminHero = ({
  eyebrow, value, unit, stats = [], actions = [], size = 40, loading,
}: AdminHeroProps) => (
  <div style={{ ...heroCard, fontFamily: FONT }}>
    <p style={{ ...sH, marginBottom: 16 }}>{eyebrow}</p>

    {loading ? (
      <div style={{ height: size, width: "45%", background: C.l3, borderRadius: 6 }} />
    ) : (
      <p style={heroNumber(size)}>
        {value}
        {unit && <span style={heroUnit}>{unit}</span>}
      </p>
    )}

    {stats.length > 0 && (
      <div style={{
        display: "flex", flexWrap: "wrap", alignItems: "flex-start",
        gap: 0, marginTop: 22, marginBottom: actions.length > 0 ? 24 : 0,
      }}>
        {stats.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "stretch" }}>
            {i > 0 && <div style={{ width: 1, background: C.bds, marginRight: 20 }} />}
            <div style={{ paddingRight: 20 }}>
              <p style={{ ...sH, fontSize: 10, letterSpacing: "0.14em", marginBottom: 5 }}>
                {s.label}
              </p>
              <p style={{
                color: C.t2, fontSize: 15, fontWeight: 400, margin: 0,
                fontFamily: FONT, fontVariantNumeric: "tabular-nums",
              }}>
                {s.value}
                {s.hint && (
                  <span style={{ color: C.t3, fontSize: 11, marginLeft: 5 }}>{s.hint}</span>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>
    )}

    {actions.length > 0 && (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: stats.length > 0 ? 0 : 22 }}>
        {actions.map((a, i) => <ActionButton key={i} action={a} />)}
      </div>
    )}
  </div>
);

export default AdminHero;
