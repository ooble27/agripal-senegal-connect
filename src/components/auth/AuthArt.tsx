import { HELP_COLORS } from "@/lib/faq";

/* Illustrations du panneau de connexion et d'inscription : une par page, en
   formes pleines aux couleurs de la marque (comme les vidéos). Statiques. */

export type ArtKind = "login" | "signup" | "individual" | "business" | "reset";

const C = HELP_COLORS;

/** Personne en buste (tête + épaules). */
const Person = ({ x, y, s, fill }: { x: number; y: number; s: number; fill: string }) => (
  <g fill={fill}>
    <circle cx={x} cy={y - 62 * s} r={30 * s} />
    <path d={`M${x - 56 * s} ${y} V${y - 6 * s} a${56 * s} ${50 * s} 0 0 1 ${112 * s} 0 V${y} Z`} />
  </g>
);

/** Immeuble avec grille de fenêtres. */
const Building = ({ x, y, w, h, fill, win, cols, rows }: { x: number; y: number; w: number; h: number; fill: string; win: string; cols: number; rows: number }) => {
  const pad = w * 0.16;
  const gw = (w - pad * 2) / cols;
  const gh = (h * 0.72 - pad) / rows;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={4} fill={fill} />
      {Array.from({ length: rows * cols }, (_, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        return <rect key={i} x={x + pad + c * gw + gw * 0.18} y={y + pad + r * gh + gh * 0.18} width={gw * 0.64} height={gh * 0.6} rx={1.5} fill={win} />;
      })}
    </g>
  );
};

const AuthArt = ({ kind, className }: { kind: ArtKind; className?: string }) => (
  <svg viewBox="0 0 200 200" className={className} aria-hidden>
    {kind === "login" && (
      // Une porte éclairée et quelqu'un qui revient : « Bon retour ».
      <g>
        <path d="M34 196V92a66 66 0 0 1 132 0v104z" fill={C.sun} />
        <path d="M56 196V96a44 44 0 0 1 88 0v100z" fill={C.cream} />
        <Person x={100} y={196} s={0.62} fill={C.forest} />
        <circle cx={132} cy={150} r={4} fill={C.sun} />
        <rect x={20} y={192} width={160} height={4} rx={2} fill={C.cream} opacity={0.35} />
      </g>
    )}

    {kind === "signup" && (
      // Les deux types de compte : une personne et une entreprise.
      <g>
        <Building x={104} y={52} w={66} h={144} fill={C.forest} win={C.sun} cols={2} rows={5} />
        <Person x={66} y={196} s={0.82} fill={C.coral} />
        <rect x={16} y={192} width={168} height={4} rx={2} fill="#14110f" opacity={0.2} />
      </g>
    )}

    {kind === "individual" && (
      // Une personne, identité vérifiée.
      <g>
        <Person x={96} y={196} s={1.3} fill={C.coral} />
        <circle cx={148} cy={142} r={22} fill={C.forest} />
        <path d="M137 142l8 8 14-16" fill="none" stroke={C.cream} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    )}

    {kind === "business" && (
      // Un immeuble de bureaux et son voisin.
      <g>
        <Building x={44} y={28} w={84} h={168} fill={C.coral} win={C.peach} cols={3} rows={6} />
        <rect x={74} y={170} width={24} height={26} rx={2} fill={C.forest} />
        <Building x={132} y={98} w={46} h={98} fill={C.forest} win={C.sun} cols={2} rows={3} />
        <rect x={16} y={192} width={168} height={4} rx={2} fill="#14110f" opacity={0.2} />
      </g>
    )}

    {kind === "reset" && (
      // Un cadenas ouvert, prêt pour un nouveau mot de passe.
      <g>
        <path d="M66 96V58a34 34 0 0 1 68 0v8" fill="none" stroke={C.forest} strokeWidth={16} strokeLinecap="round" />
        <rect x={40} y={92} width={120} height={100} rx={12} fill={C.forest} />
        <circle cx={100} cy={132} r={12} fill={C.mint} />
        <rect x={95} y={136} width={10} height={26} rx={4} fill={C.mint} />
        <circle cx={160} cy={58} r={14} fill={C.coral} />
      </g>
    )}
  </svg>
);

export default AuthArt;
