import { cn } from "@/lib/utils";

/** Mots juridiques ignorés pour le monogramme (« Diop SARL » → « D »). */
const LEGAL = new Set(["inc", "inc.", "ltd", "ltd.", "ltée", "ltee", "sarl", "sas", "sa", "llc", "corp", "corp.", "cie", "senc", "s.e.n.c.", "enr", "enr."]);

/** Petit édifice au trait (même style que les icônes de l'app). */
export const BuildingGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 20.5h16M6 20.5V8.5l6-4 6 4v12M10 20.5v-4h4v4M9.5 11h.01M14.5 11h.01" />
  </svg>
);

export function businessInitials(name?: string | null): string {
  const words = (name ?? "")
    .split(/[\s\-–—]+/)
    .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((w) => w && !LEGAL.has(w.toLowerCase()));
  return words.slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
}

const SIZES = {
  sm: "h-6 w-6 rounded-[7px] text-[10px]",
  md: "h-11 w-11 rounded-[13px] text-[15px]",
  lg: "h-16 w-16 rounded-[19px] text-[22px]",
};

/**
 * Marque d'une entreprise : son monogramme sur une tuile pleine, ou à défaut
 * un petit édifice dessiné au trait. Couleurs du thème (encre / fond).
 */
const BusinessMark = ({ name, size = "md", className }: { name?: string | null; size?: keyof typeof SIZES; className?: string }) => {
  const initials = businessInitials(name);
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center bg-foreground font-display font-semibold tracking-[-0.04em] text-background",
        SIZES[size],
        className,
      )}
    >
      {initials || <BuildingGlyph className="h-[55%] w-[55%]" />}
    </span>
  );
};

export default BusinessMark;
