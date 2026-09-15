import { useId } from "react";

interface SparklineProps {
  data: number[];
  className?: string;
  height?: number;
  width?: number;
  strokeWidth?: number;
  /** Affiche un point terminal (dernière valeur). */
  endDot?: boolean;
  /** Remplit l'aire sous la courbe. */
  fill?: boolean;
}

/** Trace lissé (Catmull-Rom → Bézier), identique à RateChart. */
function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

/**
 * Mini-graphe compact réutilisable — trace en `currentColor`, s'adapte au
 * thème via la couleur du texte. Version épurée de `RateChart` pour les tuiles
 * KPI (pas de dégradé sauf si `fill=true`).
 */
const Sparkline = ({
  data,
  className,
  height = 32,
  width = 120,
  strokeWidth = 1.5,
  endDot = false,
  fill = false,
}: SparklineProps) => {
  const id = useId();
  const W = width;
  const H = height;
  const padY = 3;

  if (data.length < 2) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={className} aria-hidden="true">
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="currentColor" strokeOpacity="0.2" strokeWidth={strokeWidth} strokeDasharray="2 3" />
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;

  const pts: [number, number][] = data.map((v, i) => [
    (i * W) / (data.length - 1),
    padY + (H - padY * 2) * (1 - (v - min) / span),
  ]);

  const line = smoothPath(pts);
  const last = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={className} aria-hidden="true">
      {fill && (
        <>
          <defs>
            <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="currentColor" stopOpacity="0.14" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${line} L ${W} ${H} L 0 ${H} Z`} fill={`url(#fill-${id})`} />
        </>
      )}
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      {endDot && <circle cx={last[0]} cy={last[1]} r={2.2} fill="currentColor" />}
    </svg>
  );
};

export default Sparkline;
