/*
 * Pré-rendu des pages publiques (référencement). Construit à part
 * (vite build --ssr) puis appelé par scripts/prerender.mjs pour écrire une
 * page HTML complète par adresse, en français et en anglais (/en).
 */
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppRoutes } from "./App";
import { AuthProvider } from "./lib/auth";
import { setRenderLang, EN_BASE, type Lang } from "./lib/i18n";
import { seoFor, seoHeadHtml, publicPaths, noindexPaths } from "./seo/seo";

export { publicPaths, noindexPaths };

export function render(path: string, lang: Lang): { html: string; head: string; title: string } | null {
  const seo = seoFor(path, lang);
  if (!seo) return null;
  setRenderLang(lang);
  const html = renderToString(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <StaticRouter basename={lang === "en" ? EN_BASE : undefined} location={lang === "en" ? `${EN_BASE}${path === "/" ? "" : path}` : path}>
          <AppRoutes />
        </StaticRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
  return { html, head: seoHeadHtml(seo, lang), title: seo.title };
}
