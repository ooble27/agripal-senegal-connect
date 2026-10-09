import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLang } from "@/lib/i18n";
import { seoFor, seoHeadHtml } from "@/seo/seo";

/** Met à jour titre, description, canonique et données structurées à chaque page. */
export default function SeoHead() {
  const { pathname } = useLocation();
  const [lang] = useLang();

  useEffect(() => {
    const seo = seoFor(pathname, lang) ?? { title: "Ooble", description: "", path: pathname, noindex: true };
    document.title = seo.title;
    document.head.querySelectorAll("[data-seo]").forEach((el) => el.remove());
    document.head.insertAdjacentHTML("beforeend", seoHeadHtml(seo, lang));
  }, [pathname, lang]);

  return null;
}
