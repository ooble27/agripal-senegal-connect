import type { HelpShape as Shape } from "@/lib/faq";

/** Forme pleine qui identifie un thème du centre d'aide. */
const HelpShape = ({ shape, color, className = "h-4 w-4" }: { shape: Shape; color: string; className?: string }) => (
  <svg viewBox="0 0 20 20" className={className} aria-hidden>
    {shape === "circle" && <circle cx="10" cy="10" r="9" fill={color} />}
    {shape === "triangle" && <path d="M10 1.5 19 18.5H1z" fill={color} />}
    {shape === "square" && <rect x="2.5" y="2.5" width="15" height="15" rx="3" fill={color} transform="rotate(12 10 10)" />}
    {shape === "half" && <path d="M1 13a9 9 0 0 1 18 0z" fill={color} />}
    {shape === "arch" && <path d="M2 19V10a8 8 0 0 1 16 0v9h-5v-9a3 3 0 0 0-6 0v9z" fill={color} />}
    {shape === "diamond" && <path d="M10 1 19 10 10 19 1 10z" fill={color} />}
  </svg>
);

export default HelpShape;
