import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  words: string[];
  /** Durée d'affichage de chaque variante, en ms. */
  interval?: number;
  className?: string;
}

/**
 * Mot qui défile verticalement : la nouvelle variante monte par le bas, la
 * précédente sort par le haut.
 *
 * Les variantes sont empilées dans une même cellule de grille — le conteneur
 * prend donc la largeur de la plus longue, et la ligne ne se réajuste pas à
 * chaque changement. Choisissez des variantes de longueur voisine : sur un
 * titre centré, un écart marqué décentre visuellement la ligne.
 */
const RotatingWord = ({ words, interval = 2800, className }: Props) => {
  const [{ cur, prev }, setIdx] = useState({ cur: 0, prev: -1 });
  const [animated, setAnimated] = useState(true);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setAnimated(false);
      return;
    }
    const id = window.setInterval(
      () => setIdx(({ cur: c }) => ({ prev: c, cur: (c + 1) % words.length })),
      interval,
    );
    return () => window.clearInterval(id);
  }, [words.length, interval]);

  if (!animated) return <span className={className}>{words[0]}</span>;

  return (
    <span
      className={cn(
        /*
         * `overflow-hidden` est ce qui masque les variantes hors champ, mais il
         * couperait aussi les jambages (le « p » de « par ») : la boîte est donc
         * rallongée vers le bas, et la marge négative annule l'effet de cette
         * rallonge sur la hauteur de la ligne.
         */
        "relative inline-grid overflow-hidden pb-[0.26em] align-bottom -mb-[0.26em]",
        className,
      )}
    >
      <span className="sr-only">{words[cur]}</span>
      {words.map((w, n) => (
        <span
          key={w}
          aria-hidden
          className={cn(
            "col-start-1 row-start-1 whitespace-nowrap transition-all duration-[650ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
            n === cur && "translate-y-0 opacity-100",
            n === prev && "-translate-y-full opacity-0",
            n !== cur && n !== prev && "translate-y-full opacity-0",
          )}
        >
          {w}
        </span>
      ))}
    </span>
  );
};

export default RotatingWord;
