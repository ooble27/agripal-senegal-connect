/*
 * Pré-rendu SEO, lancé après « vite build » et « vite build --ssr » (voir
 * le script build de package.json). Pour chaque page publique, en français
 * (/otc) et en anglais (/en/otc), écrit dist/<page>/index.html avec le
 * contenu déjà rendu et les bonnes balises <head>. Écrit aussi :
 *   dist/app-shell.html  coquille vide de l'app connectée (/app, /admin)
 *   dist/404.html        vraie page 404 (statut 404 pour les moteurs)
 *   dist/sitemap.xml     toutes les pages, avec leurs versions FR / EN
 * Toute erreur fait échouer le build : Vercel garde alors la version en ligne.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const SSR = join(ROOT, "dist-ssr", "entry-server.js");
const SITE = "https://ooble.ca";

const { render, publicPaths, noindexPaths } = await import(pathToFileURL(SSR).href);
const template = readFileSync(join(DIST, "index.html"), "utf8");
if (!template.includes('<div id="root"></div>')) throw new Error("prerender: <div id=\"root\"></div> introuvable dans dist/index.html");

/** Page complète : balises SEO à la place de celles par défaut, contenu dans #root. */
function page({ lang, title, head, html }) {
  return template
    .replace(/<html lang="[^"]*"/, `<html lang="${lang}"`)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</title>`)
    .replace(/\s*<(meta|link|script)\b[^>]*\bdata-seo\b[^>]*>(\s*<\/script>)?/g, "")
    .replace("</head>", `    ${head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${html}</div>`);
}

const urlPath = (path, lang) => (lang === "en" ? (path === "/" ? "/en" : `/en${path}`) : path);

function write(path, content) {
  const file = path === "/" ? join(DIST, "index.html") : join(DIST, path.slice(1), "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

// Coquilles sans contenu (avant d'écraser dist/index.html avec l'accueil).
const shell = (title) =>
  page({ lang: "fr", title, head: '<meta data-seo name="robots" content="noindex, nofollow">', html: "" });
writeFileSync(join(DIST, "app-shell.html"), shell("Ooble"));
writeFileSync(join(DIST, "404.html"), shell("Page introuvable | Ooble"));

let count = 0;
for (const lang of ["fr", "en"]) {
  for (const path of [...publicPaths(), ...noindexPaths()]) {
    const r = render(path, lang);
    if (!r || !r.html) throw new Error(`prerender: rendu vide pour ${lang} ${path}`);
    write(urlPath(path, lang), page({ lang, ...r }));
    count++;
  }
}

// Sitemap : chaque page dans les deux langues, liées entre elles (hreflang).
const today = new Date().toISOString().slice(0, 10);
const loc = (path, lang) => `${SITE}${urlPath(path, lang)}`;
const entries = publicPaths().flatMap((path) =>
  ["fr", "en"].map(
    (lang) => `  <url>
    <loc>${loc(path, lang)}</loc>
    <lastmod>${today}</lastmod>
    <xhtml:link rel="alternate" hreflang="fr-CA" href="${loc(path, "fr")}"/>
    <xhtml:link rel="alternate" hreflang="en-CA" href="${loc(path, "en")}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${loc(path, "fr")}"/>
  </url>`,
  ),
);
writeFileSync(
  join(DIST, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join("\n")}
</urlset>
`,
);

rmSync(join(ROOT, "dist-ssr"), { recursive: true, force: true });
console.log(`prerender: ${count} pages, ${entries.length} adresses dans le sitemap`);
