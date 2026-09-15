import { useId } from "react";
import { getLang } from "@/lib/i18n";

interface RateChartProps {
  data: number[];
  className?: string;
  height?: number;
}

/** Construit un tracé lissé (Catmull-Rom → Bézier) à partir de points. */
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
 * Mini-graphe d'aire lissé pour le taux (SVG pur, responsive).
 * Tout est tracé en `currentColor` : on reste neutre sur blanc et adaptatif
 * en mode sombre en pilotant simplement la couleur du texte via `className`.
 */
const RateChart = ({ data, className, height = 96 }: RateChartProps) => {
  const id = useId();
  const W = 320;
  const H = height;
  const padY = 12;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;

  const pts: [number, number][] = data.map((v, i) => [
    (i * W) / (data.length - 1),
    padY + (H - padY * 2) * (1 - (v - min) / span),
  ]);

  const line = smoothPath(pts);
  const area = `${line} L ${W} ${H} L 0 ${H} Z`;
  const last = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={className} role="img" aria-label={getLang() === "en" ? "Rate trend" : "Tendance du taux"}>
      <defs>
        <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.12" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#fill-${id})`} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="3" fill="currentColor" />
      <circle cx={last[0]} cy={last[1]} r="7" fill="currentColor" opacity="0.18" />
    </svg>
  );
};

export default RateChart;
