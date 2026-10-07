import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Remonte en haut de la page à chaque changement de page (lien du menu, du
 * pied de page…). Un lien vers une ancre (« /#section ») descend jusqu'à
 * elle. Le retour arrière du navigateur (POP) n'est pas touché : la position
 * précédente est conservée.
 */
const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  const type = useNavigationType();

  useEffect(() => {
    if (type === "POP") return;
    // Les jetons d'authentification passent aussi par le hash : on ne les
    // prend pas pour une ancre.
    const id = /^#[\w-]+$/.test(hash) ? hash.slice(1) : "";
    if (id) {
      // La page vient d'être montée : on attend qu'elle soit peinte.
      const t = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "instant" as ScrollBehavior }), 60);
      return () => window.clearTimeout(t);
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname, hash, type]);

  return null;
};

export default ScrollToTop;
