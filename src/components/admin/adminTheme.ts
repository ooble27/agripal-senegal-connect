/**
 * Vocabulaire visuel du back-office Ooble — thème sombre monochrome
 * inspiré du back-office Terex. Zéro couleur d'accent : tout est
 * en niveaux de gris, avec le blanc pur comme unique surbrillance.
 *
 * Utilisé partout dans `src/components/admin/*` et `src/pages/admin/*` pour
 * garder une cohérence visuelle stricte : mêmes cartes, mêmes textes, mêmes
 * transitions. Les composants qui l'importent partent d'un socle homogène ;
 * ils n'ont plus qu'à composer la structure.
 */

/** Palette — 100 % monochrome. */
export const C = {
  /** Fond principal de l'écran. */
  bg:   "#1a1a1a",
  /** Fond des cartes. */
  l1:   "#212121",
  /** Fond au-dessus (survol, sous-carte). */
  l2:   "#282828",
  /** Fond boutons, chip, icon-box. */
  l3:   "#303030",
  /** Fond boutons hover. */
  l4:   "#383838",

  /** Séparateurs internes (très subtils). */
  bds:  "#2a2a2a",
  /** Bordures cartes / boutons. */
  bd:   "#383838",
  /** Bordures au survol. */
  bdh:  "#484848",

  /** Accent unique — blanc pur. Jamais de couleur. */
  accent:      "#ffffff",
  accentSoft:  "rgba(255,255,255,0.08)",
  accentBd:    "rgba(255,255,255,0.20)",
  accentHover: "#e8e8e8",

  /** Texte primaire (titres, valeurs). */
  t1:   "#f0f0f0",
  /** Texte secondaire (labels de contenu, valeurs discrètes). */
  t2:   "#888888",
  /** Texte tertiaire (labels de section, méta). */
  t3:   "#565656",
} as const;

/**
 * Familles de police — Poppins partout, exactement comme le reste de la
 * plateforme Ooble.
 *
 * IMPORTANT : ne jamais introduire une police qui n'est pas chargée dans
 * `index.html` (seule Poppins l'est). Les chiffres n'utilisent PAS de police
 * monospace : la plateforme les rend en Poppins Light avec `tabular-nums`,
 * ce qui aligne les colonnes sans changer de famille.
 */
export const FONT = "'Poppins', system-ui, sans-serif";

/**
 * Alias conservé pour les chiffres : même famille que le reste, avec
 * `fontVariantNumeric: "tabular-nums"` appliqué via `numeric` ci-dessous.
 */
export const MONO = FONT;

/** À étaler sur tout élément affichant des chiffres alignés. */
export const numeric: React.CSSProperties = {
  fontFamily: FONT,
  fontVariantNumeric: "tabular-nums",
};

/**
 * Grand nombre de héro — calqué sur `font-display text-[34px] font-light
 * tracking-tight` utilisé dans l'app connectée.
 */
export function heroNumber(size = 40): React.CSSProperties {
  return {
    fontFamily: FONT,
    fontVariantNumeric: "tabular-nums",
    fontSize: size,
    fontWeight: 300,
    letterSpacing: "-0.02em",
    lineHeight: 1,
    color: C.t1,
    margin: 0,
  };
}

/** Unité accolée à un grand nombre (CAD, USDT, « entrées »…). */
export const heroUnit: React.CSSProperties = {
  color: C.t3,
  fontSize: 15,
  fontWeight: 400,
  marginLeft: 8,
  letterSpacing: 0,
};

/** Carte standard. */
export const card: React.CSSProperties = {
  background: C.l1,
  border: `1px solid ${C.bds}`,
  borderRadius: 14,
  overflow: "hidden",
};

/** Carte héro (dégradé subtil, ombre profonde). */
export const heroCard: React.CSSProperties = {
  background: "linear-gradient(135deg, #1e1e1e 0%, #181818 60%, #1a1a1a 100%)",
  border: `1px solid ${C.bds}`,
  borderRadius: 16,
  padding: "30px 28px 26px",
  boxShadow: "0 4px 32px rgba(0,0,0,0.45)",
};

/**
 * Label de section uppercase — calqué sur
 * `text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground`
 * de l'app connectée.
 */
export const sH: React.CSSProperties = {
  color: C.t3,
  fontSize: 11,
  fontWeight: 400,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  margin: 0,
  fontFamily: FONT,
};

/** Padding interne standard pour l'en-tête d'une carte. */
export const cardHeader: React.CSSProperties = {
  padding: "14px 20px",
  borderBottom: `1px solid ${C.bds}`,
};

/** Ligne dans une liste au sein d'une carte (sépare toutes les lignes sauf la dernière). */
export function rowStyle(isLast: boolean): React.CSSProperties {
  return {
    padding: "11px 20px",
    borderBottom: isLast ? "none" : `1px solid ${C.bds}`,
  };
}

/** Bouton primaire — plein blanc. */
export const btnPrimary: React.CSSProperties = {
  height: 36,
  paddingLeft: 18,
  paddingRight: 18,
  background: C.accent,
  border: "none",
  borderRadius: 9,
  color: "#111",
  fontSize: 12,
  fontWeight: 400,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontFamily: FONT,
  whiteSpace: "nowrap",
  transition: "background 0.15s",
};

/** Bouton secondaire — contour, bord + texte deviennent blancs au survol. */
export const btnGhost: React.CSSProperties = {
  height: 36,
  paddingLeft: 16,
  paddingRight: 16,
  background: "transparent",
  border: `1px solid ${C.bd}`,
  borderRadius: 9,
  color: C.t2,
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

/** Input / select / textarea unifiés. */
export const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.03)",
  border: `1px solid ${C.bd}`,
  borderRadius: 9,
  padding: "9px 12px",
  color: C.t1,
  fontSize: 13,
  fontFamily: FONT,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
};

/** Attache un effet de survol conforme au ghost button à un handler. */
export function ghostHoverIn(el: HTMLElement) {
  el.style.borderColor = C.accentBd;
  el.style.color = C.accent;
}
export function ghostHoverOut(el: HTMLElement) {
  el.style.borderColor = C.bd;
  el.style.color = C.t2;
}

/** Effet de survol pour bouton primaire. */
export function primaryHoverIn(el: HTMLElement) { el.style.background = C.accentHover; }
export function primaryHoverOut(el: HTMLElement) { el.style.background = C.accent; }

// ────────────────────────────────────────────────────────────
// Textures « liste dans une carte » — inspiré directement de Terex
// ────────────────────────────────────────────────────────────

/**
 * Style d'une ligne dans une liste au sein d'une carte.
 * Applique padding, séparateur du bas (sauf dernière) et transitions.
 */
export function listRowStyle(isLast: boolean): React.CSSProperties {
  return {
    padding: "14px 18px",
    borderBottom: isLast ? "none" : `1px solid ${C.bds}`,
    display: "flex",
    alignItems: "center",
    gap: 12,
    transition: "background 0.12s",
  };
}

/** Survol très subtil sur une ligne (imperceptible mais présent). */
export function listRowHoverIn(el: HTMLElement) { el.style.background = "rgba(255,255,255,0.015)"; }
export function listRowHoverOut(el: HTMLElement) { el.style.background = "transparent"; }

/** Avatar / icon-box rond utilisé à gauche d'une ligne (34px). */
export const avatarCircle: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: "50%",
  border: `1.5px solid ${C.bds}`,
  background: C.l2,
  color: C.t2,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  fontFamily: FONT,
  fontSize: 12,
  fontWeight: 400,
};

/** Bouton d'action carré (26-28px), à droite d'une ligne. */
export const iconButton: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 7,
  background: "transparent",
  border: `1px solid ${C.bds}`,
  color: C.t3,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  transition: "all 0.12s",
};

export function iconButtonHoverIn(el: HTMLElement) {
  el.style.borderColor = C.accentBd;
  el.style.color = C.accent;
}
export function iconButtonHoverOut(el: HTMLElement) {
  el.style.borderColor = C.bds;
  el.style.color = C.t3;
}

/** Petite pastille 26px pour sélecteurs internes (période, filtre, paire). */
export function pillSmall(on: boolean): React.CSSProperties {
  return {
    height: 26,
    paddingLeft: 10,
    paddingRight: 10,
    borderRadius: 7,
    border: `1px solid ${on ? C.accentBd : C.bds}`,
    background: on ? C.accentSoft : "transparent",
    color: on ? C.accent : C.t3,
    fontSize: 11,
    fontWeight: on ? 500 : 400,
    fontFamily: FONT,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    transition: "all 0.12s",
    whiteSpace: "nowrap",
  };
}

/** Chip d'action dans l'en-tête d'une carte (« Nouvelle », « + Ajouter »…). */
export const chipAction: React.CSSProperties = {
  height: 26,
  paddingLeft: 10,
  paddingRight: 10,
  background: C.accentSoft,
  border: `1px solid ${C.accentBd}`,
  borderRadius: 7,
  color: C.accent,
  fontSize: 11,
  fontWeight: 400,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontFamily: FONT,
  transition: "opacity 0.15s",
};

/** En-tête de carte avec titre et action (une ligne flex). */
export const cardHeaderRow: React.CSSProperties = {
  padding: "14px 18px",
  borderBottom: `1px solid ${C.bds}`,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

/** Titre principal d'une carte (13/600 blanc). */
export const cardTitle: React.CSSProperties = {
  color: C.t1,
  fontSize: 13,
  fontWeight: 400,
  margin: 0,
  fontFamily: FONT,
};

/** Sous-titre discret sous un titre de carte (10px, t3). */
export const cardSubtitle: React.CSSProperties = {
  color: C.t3,
  fontSize: 10,
  margin: "3px 0 0",
  fontFamily: FONT,
};
