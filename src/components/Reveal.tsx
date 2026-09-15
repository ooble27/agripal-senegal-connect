import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  /** Retard avant l'apparition, en ms — pour échelonner plusieurs blocs. */
  delay?: number;
  /** Appliqué au conteneur : nécessaire quand le bloc est un enfant de grille. */
  className?: string;
}

/**
 * Fait apparaître son contenu à l'entrée dans le champ de vision.
 *
 * L'observateur est libéré dès la première apparition : le bloc ne rejoue pas
 * l'animation à chaque passage. Sans `IntersectionObserver`, ou si l'utilisateur
 * a demandé moins d'animations, le contenu est affiché tel quel.
 */
const Reveal = ({ children, delay = 0, className }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const [instant, setInstant] = useState(false);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setInstant(true);
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShown(true);
        io.disconnect();
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        !instant && "transition-[opacity,transform] duration-[750ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
        className,
      )}
      style={instant ? undefined : { transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

export default Reveal;
