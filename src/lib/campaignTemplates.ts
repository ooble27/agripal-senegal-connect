/**
 * Modèles de courriels de campagne (marketing).
 *
 * Chaque modèle déclare ses champs modifiables et leurs valeurs par défaut,
 * puis produit un courriel HTML complet compatible avec Gmail, Outlook et
 * Apple Mail : mise en page en tableaux, styles en ligne, images PNG/JPG
 * hébergées sur ooble.ca (Gmail n'affiche pas les SVG).
 *
 * Syntaxe des champs texte :
 *   {{prenom}}  → prénom du destinataire
 *   **mot**     → mot en gras (ou en couleur selon le modèle)
 *   retour à la ligne → saut de ligne
 * Champs « lignes » : une entrée par ligne, colonnes séparées par « | ».
 */

const SITE = "https://ooble.ca";
const FONT = "Poppins, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const LOGO = `${SITE}/email-assets/logo.png`;

// Palette de la marque (pages publiques et courriels uniquement).
const K = {
  forest: "#0f5c45",
  coral: "#ff7a59",
  coralDeep: "#c2462a",
  sun: "#ffc94d",
  mint: "#bfe8d6",
  cream: "#f6f1e7",
  peach: "#ffd2c4",
  sage: "#7cc4a6",
  ink: "#14110f",
  body: "#4a4540",
  mute: "#6b655d",
  line: "#ece7dc",
  ground: "#e9e6df",
};

// ─── Images disponibles ─────────────────────────────────────

export interface EmailImage {
  id: string;
  label: string;
  url: string;
  /** Hauteur / largeur. */
  ratio: number;
}

const GUIDE_IMAGES: [string, string][] = [
  ["ooble-en-une-minute", "Vidéo : Ooble en une minute"],
  ["creer-un-compte", "Vidéo : créer un compte"],
  ["verifier-identite", "Vidéo : vérifier son identité"],
  ["acheter-usdt", "Vidéo : acheter des USDT"],
  ["payer-par-interac", "Vidéo : payer par Interac"],
  ["vendre-usdt", "Vidéo : vendre des USDT"],
  ["votre-securite", "Vidéo : votre sécurité"],
];

const ILLUSTRATIONS: [string, string][] = [
  ["signup", "Illustration : inscription"],
  ["individual", "Illustration : particulier"],
  ["business", "Illustration : entreprise"],
  ["login", "Illustration : connexion"],
  ["reset", "Illustration : mot de passe"],
];

export const EMAIL_IMAGES: EmailImage[] = [
  ...GUIDE_IMAGES.map(([slug, label]) => ({
    id: `guide:${slug}`, label, url: `${SITE}/guides/videos/${slug}-fr.jpg`, ratio: 720 / 1280,
  })),
  ...ILLUSTRATIONS.map(([slug, label]) => ({
    id: `ill:${slug}`, label, url: `${SITE}/email-assets/ill-${slug}.png`, ratio: 488 / 640,
  })),
];

function image(id: string): EmailImage {
  return EMAIL_IMAGES.find((i) => i.id === id) ?? EMAIL_IMAGES[0];
}

/** Page du guide vidéo correspondant à une image, sinon le centre des guides. */
export function guideUrlFor(imageId: string): string {
  return imageId.startsWith("guide:") ? `${SITE}/guide/${imageId.slice(6)}` : `${SITE}/guide`;
}

const NETWORKS = [
  { name: "Tron", std: "TRC20", note: "Le plus utilisé pour les USDT", icon: `${SITE}/email-assets/coin-trx.png` },
  { name: "BNB Chain", std: "BEP20", note: "Rapide et économique", icon: `${SITE}/email-assets/coin-bnb.png` },
  { name: "Polygon", std: "POL", note: "Frais très bas", icon: `${SITE}/email-assets/coin-matic.png` },
  { name: "Solana", std: "SOL", note: "Règlement quasi instantané", icon: `${SITE}/email-assets/coin-sol.png` },
];

// ─── Types ──────────────────────────────────────────────────

export type FieldKind = "text" | "textarea" | "url" | "lines" | "image";

export interface TemplateField {
  key: string;
  label: string;
  kind: FieldKind;
  /** Aide sous le champ (format des lignes, etc.). */
  hint?: string;
}

export interface RenderCtx {
  prenom: string;
  email: string;
  unsubscribeUrl: string;
}

export type TemplateValues = Record<string, string>;

export type TemplateCategory = "Lancement" | "Éducation" | "Relance" | "Infolettre" | "Offre";

export interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  /** Couleurs de la vignette dans la galerie : fond, accent. */
  swatch: [string, string];
  isNew?: boolean;
  fields: TemplateField[];
  /** Valeurs par défaut, y compris `subject` et `preheader`. */
  defaults: TemplateValues;
  body: (v: TemplateValues, ctx: RenderCtx) => string;
  /** Fond de la carte (600 px). */
  cardBg?: string;
}

// ─── Texte ──────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function vars(s: string, ctx: RenderCtx): string {
  return s
    .replace(/\{\{\s*prenom\s*\}\}/gi, ctx.prenom)
    .replace(/\{\{\s*email\s*\}\}/gi, ctx.email);
}

/** Texte saisi → HTML sûr : variables, **gras**, sauts de ligne. */
function rich(s: string | undefined, ctx: RenderCtx, strong = ""): string {
  const open = strong ? `<strong style="${strong}">` : "<strong>";
  return esc(vars(s ?? "", ctx).trim())
    .replace(/\*\*(.+?)\*\*/g, `${open}$1</strong>`)
    .replace(/\n/g, "<br>");
}

/** Texte brut avec variables (objet, préentête). */
export function plainText(s: string, ctx: RenderCtx): string {
  return vars(s, ctx).trim();
}

function lines(s: string | undefined): string[][] {
  return (s ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split("|").map((c) => c.trim()));
}

function href(u: string | undefined): string {
  const url = (u ?? "").trim();
  if (!url) return SITE;
  if (/^(https?:|mailto:)/i.test(url)) return esc(url);
  if (url.startsWith("/")) return esc(SITE + url);
  if (url.includes("@") && !url.includes("/")) return esc(`mailto:${url}`);
  return esc(`https://${url}`);
}

// ─── Briques ────────────────────────────────────────────────

const P = (pad: string, inner: string, extra = "") =>
  `<tr><td class="px" style="padding:${pad};${extra}">${inner}</td></tr>`;

function btn(label: string, url: string, bg: string, fg: string, opts: { radius?: number; block?: boolean; size?: number } = {}): string {
  const r = opts.radius ?? 12;
  const size = opts.size ?? 15;
  const width = opts.block ? ' width="100%"' : "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"${width}><tr><td align="center" bgcolor="${bg}" style="border-radius:${r}px;background:${bg};">
<a href="${href(url)}" style="display:${opts.block ? "block" : "inline-block"};padding:16px 28px;font-family:${FONT};font-size:${size}px;font-weight:600;line-height:1.2;color:${fg};text-decoration:none;border-radius:${r}px;">${esc(label)}</a>
</td></tr></table>`;
}

function brand(color: string, right = "", rightColor = color, rightStyle = ""): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="vertical-align:middle;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="vertical-align:middle;"><img src="${LOGO}" width="30" height="30" alt="" style="display:block;border-radius:8px;"></td>
<td style="vertical-align:middle;padding-left:10px;font-family:${FONT};font-size:18px;font-weight:600;color:${color};">Ooble</td>
</tr></table></td>
${right ? `<td align="right" style="vertical-align:middle;font-family:${FONT};font-size:12px;color:${rightColor};${rightStyle}">${right}</td>` : ""}
</tr></table>`;
}

function pill(text: string, bg: string, fg: string): string {
  return `<span style="display:inline-block;padding:6px 12px;border-radius:99px;background:${bg};color:${fg};font-family:${FONT};font-size:11.5px;font-weight:600;line-height:1.2;">${text}</span>`;
}

const h1 = (html: string, color: string, size = 40, weight = 600) =>
  `<h1 class="h1" style="margin:0;font-family:${FONT};font-size:${size}px;line-height:1.08;font-weight:${weight};letter-spacing:-0.03em;color:${color};">${html}</h1>`;

const h2 = (html: string, color: string = K.ink, size = 22) =>
  `<h2 style="margin:0;font-family:${FONT};font-size:${size}px;line-height:1.25;font-weight:600;letter-spacing:-0.02em;color:${color};">${html}</h2>`;

const para = (html: string, color: string = K.body, size = 16, margin = "0") =>
  `<p style="margin:${margin};font-family:${FONT};font-size:${size}px;line-height:1.6;color:${color};">${html}</p>`;

const eyebrow = (text: string, color: string) =>
  `<p style="margin:0;font-family:${FONT};font-size:11.5px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${color};">${text}</p>`;

/** Image cliquable pleine largeur, avec pastille « vidéo » facultative. */
function picture(img: EmailImage, link: string, width: number, opts: { radius?: number; badge?: string; badgeBg?: string; badgeFg?: string } = {}): string {
  const height = Math.round(width * img.ratio);
  const r = opts.radius ?? 16;
  const badge = opts.badge
    ? `<tr><td style="padding-top:10px;"><a href="${href(link)}" style="display:inline-block;padding:9px 14px;border-radius:99px;background:${opts.badgeBg ?? K.ink};color:${opts.badgeFg ?? "#ffffff"};font-family:${FONT};font-size:13px;font-weight:600;text-decoration:none;">&#9654;&#xFE0E;&nbsp; ${esc(opts.badge)}</a></td></tr>`
    : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td><a href="${href(link)}"><img class="fluid" src="${img.url}" width="${width}" height="${height}" alt="${esc(img.label)}" style="display:block;width:${width}px;max-width:100%;height:auto;border:0;border-radius:${r}px;"></a></td></tr>${badge}
</table>`;
}

/** Grille de cellules sur N colonnes (empilées sur téléphone). */
function grid(cells: string[], cols: number, gap = 12): string {
  const rows: string[] = [];
  for (let i = 0; i < cells.length; i += cols) {
    const slice = cells.slice(i, i + cols);
    while (slice.length < cols) slice.push("");
    const tds = slice.map((c, j) => {
      const pl = j === 0 ? 0 : gap / 2;
      const pr = j === cols - 1 ? 0 : gap / 2;
      return `<td class="stack" width="${Math.floor(100 / cols)}%" valign="top" style="padding:0 ${pr}px ${gap}px ${pl}px;">${c}</td>`;
    }).join("");
    rows.push(`<tr>${tds}</tr>`);
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows.join("")}</table>`;
}

/** Boîte à fond coloré (carte). */
function box(inner: string, bg: string, opts: { pad?: string; radius?: number; border?: string } = {}): string {
  const border = opts.border ? `border:1px solid ${opts.border};` : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${bg}" style="background:${bg};${border}border-radius:${opts.radius ?? 16}px;padding:${opts.pad ?? "20px"};">${inner}</td></tr></table>`;
}

/** Rond numéroté + texte, alignés. */
function numbered(n: string, title: string, text: string, opts: { dotBg: string; dotFg: string; square?: boolean; titleColor?: string; textColor?: string }): string {
  const r = opts.square ? 12 : 99;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="40" valign="top"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="40" height="40" align="center" valign="middle" bgcolor="${opts.dotBg}" style="width:40px;height:40px;border-radius:${r}px;background:${opts.dotBg};color:${opts.dotFg};font-family:${FONT};font-size:16px;font-weight:600;">${n}</td></tr></table></td>
<td valign="top" style="padding-left:16px;">
<p style="margin:0;font-family:${FONT};font-size:16px;font-weight:600;line-height:1.35;color:${opts.titleColor ?? K.ink};">${title}</p>
${text ? `<p style="margin:4px 0 0;font-family:${FONT};font-size:14px;line-height:1.55;color:${opts.textColor ?? K.body};">${text}</p>` : ""}
</td></tr></table>`;
}

function networksRow(size = 40): string {
  return NETWORKS.map((n) =>
    `<img src="${n.icon}" width="${size}" height="${size}" alt="${n.name}" style="display:inline-block;width:${size}px;height:${size}px;border:0;margin-left:8px;">`,
  ).join("");
}

interface FooterOpts {
  bg: string;
  color: string;
  link: string;
  links?: [string, string][];
  note?: string;
  top?: string;
}

function footer(ctx: RenderCtx, o: FooterOpts): string {
  const links = (o.links ?? [["Centre d'aide", "/faq"], ["Guides vidéo", "/guide"], ["Nous joindre", "/contact"]])
    .map(([l, u]) => `<a href="${href(u)}" style="color:${o.link};text-decoration:none;font-weight:500;">${esc(l)}</a>`)
    .join(`&nbsp;&nbsp;·&nbsp;&nbsp;`);
  return `<tr><td class="px" bgcolor="${o.bg}" style="background:${o.bg};padding:26px 32px;${o.top ? `border-top:1px solid ${o.top};` : ""}font-family:${FONT};font-size:12px;line-height:1.65;color:${o.color};">
<p style="margin:0 0 10px;">${links}</p>
${o.note ? `<p style="margin:0 0 10px;">${o.note}</p>` : ""}
<p style="margin:0;">Vous recevez ce courriel parce que vous êtes inscrit sur ooble.ca. <a href="${esc(ctx.unsubscribeUrl)}" style="color:${o.color};text-decoration:underline;">Se désabonner</a> · Ooble · Canada</p>
</td></tr>`;
}

// ─── Document complet ───────────────────────────────────────

function documentHtml(preheader: string, cardBg: string, rows: string): string {
  return `<!doctype html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Ooble</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
body{margin:0;padding:0;-webkit-text-size-adjust:100%;}
table{border-collapse:collapse;}
img{border:0;outline:none;text-decoration:none;}
a{text-decoration:none;}
@media (max-width:620px){
  .card{width:100%!important;border-radius:0!important;}
  .outer{padding:0!important;}
  .px{padding-left:22px!important;padding-right:22px!important;}
  .stack{display:block!important;width:100%!important;padding-left:0!important;padding-right:0!important;}
  .stack-px{display:block!important;width:100%!important;box-sizing:border-box!important;padding-left:22px!important;padding-right:22px!important;}
  .otc-b{padding-top:16px!important;padding-bottom:16px!important;border-right:0!important;border-bottom:1px solid #222224!important;}
  .h1{font-size:32px!important;line-height:1.1!important;}
  .big{font-size:68px!important;}
  .hide-m{display:none!important;}
  img.fluid{width:100%!important;height:auto!important;}
}
</style>
</head>
<body style="margin:0;padding:0;background:${K.ground};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${K.ground}" style="background:${K.ground};">
<tr><td class="outer" align="center" style="padding:32px 12px;">
<table role="presentation" class="card" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="${cardBg}" style="width:600px;max-width:600px;background:${cardBg};border-radius:20px;overflow:hidden;font-family:${FONT};color:${K.ink};">
${rows}
</table>
</td></tr>
</table>
</body>
</html>`;
}

// ─── Champs réutilisés ──────────────────────────────────────

const F = {
  subject: { key: "subject", label: "Objet", kind: "text" } as TemplateField,
  preheader: { key: "preheader", label: "Préentête (aperçu dans la boîte)", kind: "text" } as TemplateField,
  headline: { key: "headline", label: "Titre", kind: "textarea" } as TemplateField,
  intro: { key: "intro", label: "Texte", kind: "textarea" } as TemplateField,
  cta: { key: "cta", label: "Bouton", kind: "text" } as TemplateField,
  ctaUrl: { key: "ctaUrl", label: "Lien du bouton", kind: "url" } as TemplateField,
};

const STEPS_HINT = "Une étape par ligne : Titre | description";

// ─── Modèles ────────────────────────────────────────────────

const lancement: CampaignTemplate = {
  id: "lancement",
  name: "Lancement",
  description: "Grand en-tête vert, illustration, trois étapes. Pour annoncer l'ouverture ou attirer de nouveaux clients.",
  category: "Lancement",
  swatch: [K.forest, K.sun],
  fields: [
    F.subject, F.preheader,
    { key: "headline", label: "Titre", kind: "text" },
    { key: "highlight", label: "Titre, suite en jaune", kind: "text" },
    F.intro, F.cta, F.ctaUrl,
    { key: "image", label: "Image", kind: "image" },
    { key: "stepsTitle", label: "Titre des étapes", kind: "text" },
    { key: "steps", label: "Étapes", kind: "lines", hint: STEPS_HINT },
    { key: "closing", label: "Phrase finale", kind: "text" },
    { key: "cta2", label: "Bouton final", kind: "text" },
  ],
  defaults: {
    subject: "Ooble est ouvert : vos USDT en dollars canadiens",
    preheader: "Achetez et vendez des USDT par Interac, en quelques minutes.",
    headline: "Ooble est ouvert.",
    highlight: "Vos USDT en dollars canadiens.",
    intro: "Achetez et vendez des USDT par virement Interac, en quelques minutes. Les USDT arrivent directement dans votre wallet : Ooble ne garde jamais votre argent.",
    cta: "Ouvrir mon compte",
    ctaUrl: "/inscription",
    image: "ill:signup",
    stepsTitle: "Trois étapes, une seule fois pour la vérification.",
    steps: [
      "Créez votre compte | Gratuit, en moins d'une minute, avec votre nom légal complet.",
      "Vérifiez votre identité | Une pièce d'identité et un selfie. C'est une exigence de la loi canadienne.",
      "Achetez ou vendez | Payez par Interac, recevez vos USDT dans votre wallet. Le taux affiché est garanti 15 minutes.",
    ].join("\n"),
    closing: "Prêt à commencer ?",
    cta2: "Ouvrir mon compte gratuit",
  },
  body: (v, ctx) => {
    const img = image(v.image);
    const steps = lines(v.steps).map(([t, d], i) =>
      `<tr><td style="padding-bottom:12px;">${box(numbered(String(i + 1), esc(t ?? ""), rich(d, ctx), { dotBg: K.forest, dotFg: K.cream, square: true }), K.cream, { pad: "18px" })}</td></tr>`,
    ).join("");
    return [
      `<tr><td class="px" bgcolor="${K.forest}" style="background:${K.forest};padding:22px 32px;">${brand(K.cream, "Acheter et vendre des USDT au Canada", K.mint, "")}</td></tr>`,
      `<tr><td class="px" bgcolor="${K.forest}" style="background:${K.forest};padding:14px 32px 0;">
        ${h1(`${rich(v.headline, ctx)}<br><span style="color:${K.sun};">${rich(v.highlight, ctx)}</span>`, K.cream, 44)}
        ${para(rich(v.intro, ctx), "#d7eee3", 16, "20px 0 24px")}
        ${btn(v.cta, v.ctaUrl, K.coral, K.ink)}
      </td></tr>`,
      `<tr><td bgcolor="${K.forest}" style="background:${K.forest};padding-top:28px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="${K.mint}" style="background:${K.mint};border-radius:160px 160px 0 0;padding:24px 0 0;">
        <img class="fluid" src="${img.url}" width="320" alt="${esc(img.label)}" style="display:block;width:320px;max-width:80%;height:auto;border:0;">
      </td></tr></table></td></tr>`,
      P("40px 32px 8px", `${eyebrow("Comment ça marche", K.forest)}<div style="height:8px;line-height:8px;">&nbsp;</div>${h2(rich(v.stepsTitle, ctx), K.ink, 26)}<div style="height:22px;line-height:22px;">&nbsp;</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${steps}</table>`),
      P("20px 32px 8px", box(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td valign="middle" style="font-family:${FONT};font-size:14px;font-weight:500;line-height:1.4;color:${K.ink};">Recevez vos USDT<br>sur 4 réseaux</td>
        <td align="right" valign="middle" style="white-space:nowrap;">${networksRow(36)}</td></tr></table>`, "#ffffff", { border: K.line, pad: "18px 20px" })),
      `<tr><td class="px" align="center" style="padding:32px;">${para(`<strong style="color:${K.ink};font-size:18px;">${rich(v.closing, ctx)}</strong>`, K.ink, 18, "0 0 18px")}${btn(v.cta2 || v.cta, v.ctaUrl, K.ink, "#ffffff")}</td></tr>`,
      footer(ctx, { bg: K.cream, color: K.mute, link: K.forest }),
    ].join("");
  },
};

const guideInterac: CampaignTemplate = {
  id: "guide-interac",
  name: "Guide Interac",
  description: "Fond crème, vidéo en vedette et quatre règles en cartes. Pour expliquer une procédure.",
  category: "Éducation",
  swatch: [K.cream, K.coral],
  cardBg: K.cream,
  fields: [
    F.subject, F.preheader,
    { key: "label", label: "Étiquette", kind: "text" },
    { key: "headline", label: "Titre", kind: "text" },
    { key: "highlight", label: "Titre, suite en corail", kind: "text" },
    F.intro,
    { key: "image", label: "Vidéo / image", kind: "image" },
    { key: "videoLabel", label: "Texte sur la vidéo", kind: "text" },
    { key: "rules", label: "Règles", kind: "lines", hint: "Une règle par ligne : Titre | description (utilisez **mot** pour le gras)" },
    F.cta, F.ctaUrl,
  ],
  defaults: {
    subject: "4 règles pour que vos USDT partent tout seuls",
    preheader: "Le bon destinataire, le montant exact, la référence et un compte à votre nom.",
    label: "Guide",
    headline: "Vos USDT en quelques minutes :",
    highlight: "4 règles pour le virement Interac.",
    intro: "Quand votre virement respecte ces 4 règles, il est reconnu automatiquement et vos USDT partent tout seuls.",
    image: "guide:payer-par-interac",
    videoLabel: "Voir la vidéo · 1 min",
    rules: [
      "Le bon destinataire | Envoyez à **interac@ooble.ca**. Le dépôt est automatique : aucune question de sécurité.",
      "Le montant exact | Au cent près, en un seul virement. N'arrondissez pas et ne payez pas deux ordres ensemble.",
      "La référence | Dans le message, seulement la référence de l'ordre, qui commence par **OOB**.",
      "Un compte à votre nom | Le même nom que sur Ooble. Le paiement d'une autre personne est remboursé.",
    ].join("\n"),
    cta: "Acheter des USDT",
    ctaUrl: "/app/acheter",
  },
  body: (v, ctx) => {
    const img = image(v.image);
    const cells = lines(v.rules).map(([t, d], i) => box(
      `<p style="margin:0 0 10px;font-family:${FONT};font-size:30px;font-weight:600;line-height:1;color:${K.coral};">${i + 1}</p>
       <p style="margin:0 0 8px;font-family:${FONT};font-size:15px;font-weight:600;color:${K.ink};">${esc(t ?? "")}</p>
       <p style="margin:0;font-family:${FONT};font-size:13.5px;line-height:1.55;color:${K.body};">${rich(d, ctx, `color:${K.ink};`)}</p>`,
      "#ffffff",
    ));
    return [
      P("24px 32px", brand(K.ink, esc(v.label).toUpperCase(), K.coralDeep, "font-weight:600;letter-spacing:0.12em;")),
      P("8px 32px 24px", `${h1(`${rich(v.headline, ctx)} <span style="color:${K.coralDeep};">${rich(v.highlight, ctx)}</span>`, K.ink, 38)}${para(rich(v.intro, ctx), K.body, 16, "16px 0 0")}`),
      P("0 32px", picture(img, guideUrlFor(v.image), 536, { radius: 18, badge: v.videoLabel, badgeBg: K.ink })),
      P("28px 32px 0", grid(cells, 2)),
      `<tr><td class="px" style="padding:16px 32px 36px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td valign="middle">${btn(v.cta, v.ctaUrl, K.ink, "#ffffff")}</td>
        <td align="right" valign="middle"><img src="${SITE}/email-assets/interac.png" width="54" alt="Interac" style="display:block;width:54px;height:auto;border:0;"></td>
      </tr></table></td></tr>`,
      footer(ctx, {
        bg: K.ink, color: "#b5aea4", link: K.peach,
        links: [["Questions sur Interac", "/faq/payer-par-interac"], ["Nous joindre", "/contact"]],
        note: "Ooble ne vous demandera jamais un code ou un mot de passe. Nos courriels viennent seulement de ooble.ca.",
      }),
    ].join("");
  },
};

const relanceKyc: CampaignTemplate = {
  id: "relance-kyc",
  name: "Relance vérification",
  description: "Lettre personnelle avec barre de progression. Pour les clients inscrits qui n'ont pas vérifié leur identité.",
  category: "Relance",
  swatch: ["#ffffff", K.forest],
  fields: [
    F.subject, F.preheader,
    { key: "greeting", label: "Salutation", kind: "text" },
    F.headline, F.intro,
    { key: "needs", label: "Ce qu'il faut", kind: "lines", hint: "Deux lignes : Titre | description" },
    F.cta, F.ctaUrl,
    { key: "note", label: "Note sous le bouton", kind: "text" },
  ],
  defaults: {
    subject: "{{prenom}}, il ne vous manque qu'une étape",
    preheader: "Vérifiez votre identité en deux minutes pour passer votre premier ordre.",
    greeting: "Bonjour {{prenom}},",
    headline: "Il ne vous manque qu'une étape avant votre premier achat.",
    intro: "Votre compte Ooble est créé. Pour acheter ou vendre des USDT, la loi canadienne nous demande de vérifier votre identité, une seule fois. Ça prend environ deux minutes.",
    needs: [
      "Une pièce d'identité | Passeport, permis de conduire ou carte d'identité, en cours de validité.",
      "Un selfie | Pris en direct avec votre téléphone, pour confirmer que c'est bien vous.",
    ].join("\n"),
    cta: "Vérifier mon identité",
    ctaUrl: "/app/verification",
    note: "Vos documents sont chiffrés et conservés selon les règles du CANAFE.",
  },
  body: (v, ctx) => {
    const check = `<td width="30" height="30" align="center" valign="middle" bgcolor="${K.forest}" style="width:30px;height:30px;border-radius:99px;background:${K.forest};color:${K.cream};font-family:${FONT};font-size:14px;font-weight:700;">&#10003;</td>`;
    const dot = (n: string, bg: string, fg: string, border = "") =>
      `<td width="30" height="30" align="center" valign="middle" bgcolor="${bg}" style="width:30px;height:30px;border-radius:99px;background:${bg};${border}color:${fg};font-family:${FONT};font-size:13px;font-weight:600;">${n}</td>`;
    const step = (dotTd: string, label: string, state: string, labelStyle: string, stateColor: string) =>
      `<tr><td style="padding:7px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="30"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${dotTd}</tr></table></td>
        <td style="padding-left:14px;font-family:${FONT};font-size:15px;${labelStyle}">${label}</td>
        <td align="right" style="font-family:${FONT};font-size:12.5px;font-weight:600;color:${stateColor};">${state}</td>
      </tr></table></td></tr>`;
    const needs = lines(v.needs).map(([t, d]) => box(
      `<p style="margin:0 0 6px;font-family:${FONT};font-size:14.5px;font-weight:600;color:${K.ink};">${esc(t ?? "")}</p>
       <p style="margin:0;font-family:${FONT};font-size:13px;line-height:1.5;color:${K.body};">${rich(d, ctx)}</p>`,
      "#ffffff", { border: K.line, pad: "18px" },
    ));
    return [
      P("28px 40px 0", brand(K.ink)),
      P("34px 40px 8px", `${para(rich(v.greeting, ctx), K.body, 16, "0 0 16px")}${h1(rich(v.headline, ctx), K.ink, 34)}${para(rich(v.intro, ctx), K.body, 16, "18px 0 0")}`),
      P("22px 40px 0", box(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${step(check, "Compte créé", "Fait", `color:${K.ink};`, K.forest)}
        ${step(dot("2", K.coral, K.ink), "Vérifier votre identité", "À faire", `color:${K.ink};font-weight:600;`, K.coralDeep)}
        ${step(dot("3", "#ffffff", "#8a8379", "border:1.5px solid #cfc8bb;"), "Premier achat de USDT", "", "color:#8a8379;", "#8a8379")}
      </table>`, K.cream, { pad: "16px 22px", radius: 18 })),
      P("24px 40px 0", grid(needs, 2)),
      `<tr><td class="px" align="center" style="padding:16px 40px 8px;">${btn(v.cta, v.ctaUrl, K.forest, K.cream, { block: true, size: 16, radius: 14 })}${para(rich(v.note, ctx), "#8a8379", 13, "14px 0 0")}</td></tr>`,
      P("26px 40px 34px", `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="44" height="44" align="center" valign="middle" bgcolor="${K.mint}" style="width:44px;height:44px;border-radius:99px;background:${K.mint};color:${K.forest};font-family:${FONT};font-size:15px;font-weight:600;">O</td>
        <td style="padding-left:14px;"><p style="margin:0;font-family:${FONT};font-size:14.5px;font-weight:600;color:${K.ink};">L'équipe Ooble</p><p style="margin:2px 0 0;font-family:${FONT};font-size:13px;color:${K.body};">Une question ? Répondez simplement à ce courriel.</p></td>
      </tr></table>`),
      footer(ctx, { bg: "#ffffff", color: "#8a8379", link: K.forest, top: K.line }),
    ].join("");
  },
};

const reseaux: CampaignTemplate = {
  id: "reseaux",
  name: "Réseaux",
  description: "En-tête jaune soleil, colonnes des 4 réseaux. Pour un « bon à savoir » produit.",
  category: "Éducation",
  swatch: [K.sun, K.ink],
  fields: [
    F.subject, F.preheader,
    { key: "badge", label: "Pastille", kind: "text" },
    F.headline, F.intro,
    { key: "tip", label: "Encadré", kind: "textarea" },
    F.cta, F.ctaUrl,
    { key: "link", label: "Lien secondaire", kind: "text" },
    { key: "linkUrl", label: "Adresse du lien secondaire", kind: "url" },
  ],
  defaults: {
    subject: "Vos USDT, sur le réseau de votre choix",
    preheader: "Tron, BNB Chain, Polygon ou Solana : choisissez au moment de l'ordre.",
    badge: "Bon à savoir",
    headline: "Vos USDT,\nsur le réseau\nde votre choix.",
    intro: "Choisissez le réseau au moment de l'ordre. Le taux ne change pas : seuls les frais du réseau varient.",
    tip: "Vérifiez que l'adresse de votre wallet correspond au réseau choisi : une adresse Tron commence par T, une adresse BNB Chain ou Polygon par 0x. Une transaction blockchain ne peut pas être annulée.",
    cta: "Acheter des USDT",
    ctaUrl: "/app/acheter",
    link: "Quel réseau choisir ?",
    linkUrl: "/faq/acheter",
  },
  body: (v, ctx) => {
    const bars = [
      [K.ink, 120, NETWORKS[0]], ["#ffffff", 92, NETWORKS[1]], [K.coral, 104, NETWORKS[2]], [K.forest, 80, NETWORKS[3]],
    ] as const;
    const barCells = bars.map(([bg, h, n], i) =>
      `<td width="25%" valign="bottom" style="padding:0 ${i === 3 ? 0 : 7}px 0 ${i === 0 ? 0 : 7}px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" valign="middle" height="${h}" bgcolor="${bg}" style="height:${h}px;background:${bg};border-radius:22px 22px 0 0;"><img src="${n.icon}" width="48" height="48" alt="${n.name}" style="display:block;width:48px;height:48px;border:0;"></td></tr></table></td>`,
    ).join("");
    const list = NETWORKS.map((n, i) =>
      `<tr><td style="padding:14px 0;${i < 3 ? `border-bottom:1px solid ${K.line};` : ""}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="40"><img src="${n.icon}" width="40" height="40" alt="" style="display:block;border:0;"></td>
        <td style="padding-left:16px;"><p style="margin:0;font-family:${FONT};font-size:16px;font-weight:600;color:${K.ink};">${n.name}</p><p style="margin:2px 0 0;font-family:${FONT};font-size:13.5px;color:${K.body};">${n.note}</p></td>
        <td align="right" style="font-family:${FONT};font-size:12px;font-weight:600;letter-spacing:0.08em;color:#8a8379;">${n.std}</td>
      </tr></table></td></tr>`,
    ).join("");
    return [
      `<tr><td class="px" bgcolor="${K.sun}" style="background:${K.sun};padding:26px 32px 0;">
        ${brand(K.ink, pill(esc(v.badge), K.ink, K.sun))}
        <div style="height:22px;line-height:22px;">&nbsp;</div>
        ${h1(rich(v.headline, ctx), K.ink, 46, 800)}
        ${para(rich(v.intro, ctx), K.ink, 16, "20px 0 26px")}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${barCells}</tr></table>
      </td></tr>`,
      P("22px 32px 0", `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${list}</table>`),
      P("16px 32px 0", box(para(rich(v.tip, ctx), K.ink, 14), "#fff4d6", { pad: "18px 22px" })),
      `<tr><td class="px" style="padding:28px 32px 32px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td valign="middle">${btn(v.cta, v.ctaUrl, K.ink, K.sun)}</td>
        ${v.link ? `<td valign="middle" style="padding-left:18px;"><a href="${href(v.linkUrl)}" style="font-family:${FONT};font-size:14px;font-weight:500;color:${K.ink};text-decoration:underline;">${esc(v.link)}</a></td>` : ""}
      </tr></table></td></tr>`,
      footer(ctx, { bg: K.ink, color: "#b5aea4", link: K.sun, note: "USDT en dollars canadiens, par Interac." }),
    ].join("");
  },
};

const otc: CampaignTemplate = {
  id: "otc",
  name: "Desk OTC (noir)",
  description: "Noir haut de gamme, grand chiffre fin. Pour les gros volumes et les clients importants.",
  category: "Offre",
  swatch: ["#0d0d0e", K.coral],
  cardBg: "#0d0d0e",
  fields: [
    F.subject, F.preheader,
    { key: "amount", label: "Montant affiché", kind: "text" },
    F.headline,
    { key: "benefits", label: "Avantages", kind: "lines", hint: "Trois lignes : Titre | description" },
    { key: "steps", label: "Déroulé", kind: "lines", hint: STEPS_HINT },
    { key: "contact", label: "Adresse du desk", kind: "text" },
  ],
  defaults: {
    subject: "Gros montants de USDT : un prix ferme, un seul interlocuteur",
    preheader: "Le desk OTC d'Ooble, à partir de 10 000 $.",
    amount: "10 000",
    headline: "Achetez ou vendez de gros montants de USDT à un prix ferme, avec un seul interlocuteur.",
    benefits: [
      "Prix ferme | Garanti pendant la durée indiquée.",
      "Un interlocuteur | De la demande à la réception.",
      "En une fois | Pas besoin d'étaler sur plusieurs jours.",
    ].join("\n"),
    steps: [
      "Vous nous écrivez | Achat ou vente, le montant et le réseau.",
      "Nous vérifions le dossier | Votre identité et l'origine des fonds. C'est rapide.",
      "Vous recevez un prix ferme | Garanti pendant la durée indiquée.",
      "Vous acceptez, nous réglons | Par virement bancaire, en une seule fois.",
    ].join("\n"),
    contact: "otc@ooble.ca",
  },
  body: (v, ctx) => {
    const line = "#222224";
    const benefits = lines(v.benefits).map(([t, d], i, all) =>
      `<td class="stack-px otc-b" width="${Math.floor(100 / all.length)}%" valign="top" style="padding:22px ${i === all.length - 1 ? 32 : 18}px 22px ${i === 0 ? 32 : 18}px;${i < all.length - 1 ? `border-right:1px solid ${line};` : ""}">
        <p style="margin:0;font-family:${FONT};font-size:15px;font-weight:500;color:#f4f2ee;">${esc(t ?? "")}</p>
        <p style="margin:6px 0 0;font-family:${FONT};font-size:13px;line-height:1.5;color:#a3a09b;">${rich(d, ctx)}</p></td>`,
    ).join("");
    const steps = lines(v.steps).map(([t, d], i, all) =>
      `<tr><td style="padding:18px 0;border-top:1px solid ${line};${i === all.length - 1 ? `border-bottom:1px solid ${line};` : ""}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="34" valign="top" style="font-family:${FONT};font-size:14px;color:${K.coral};">${String(i + 1).padStart(2, "0")}</td>
        <td valign="top"><p style="margin:0;font-family:${FONT};font-size:16px;color:#f4f2ee;">${esc(t ?? "")}</p><p style="margin:4px 0 0;font-family:${FONT};font-size:13.5px;line-height:1.5;color:#a3a09b;">${rich(d, ctx)}</p></td>
      </tr></table></td></tr>`,
    ).join("");
    return [
      `<tr><td class="px" style="padding:24px 36px;border-bottom:1px solid ${line};">${brand("#f4f2ee", "Desk OTC · Gros volumes", "#8c8a86", "letter-spacing:0.08em;")}</td></tr>`,
      P("46px 36px 40px", `
        <p style="margin:0;font-family:${FONT};font-size:13px;letter-spacing:0.16em;text-transform:uppercase;color:#8c8a86;">À partir de</p>
        <p class="big" style="margin:6px 0 0;font-family:${FONT};font-size:92px;line-height:0.95;font-weight:300;letter-spacing:-0.05em;color:#f4f2ee;">${esc(v.amount)}&nbsp;<span style="color:${K.coral};">$</span></p>
        <p style="margin:26px 0 30px;font-family:${FONT};font-size:26px;line-height:1.3;font-weight:400;letter-spacing:-0.02em;color:#f4f2ee;">${rich(v.headline, ctx)}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td>${btn("Écrire au desk", `mailto:${v.contact}`, "#f4f2ee", "#0d0d0e", { radius: 99 })}</td>
          <td style="padding-left:12px;"><a href="${SITE}/otc" style="display:inline-block;padding:15px 22px;border:1px solid #333336;border-radius:99px;font-family:${FONT};font-size:15px;color:#f4f2ee;text-decoration:none;">Comment ça marche</a></td>
        </tr></table>`),
      `<tr><td style="border-top:1px solid ${line};border-bottom:1px solid ${line};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${benefits}</tr></table></td></tr>`,
      P("40px 36px 12px", `<p style="margin:0 0 20px;font-family:${FONT};font-size:13px;letter-spacing:0.16em;text-transform:uppercase;color:#8c8a86;">Le déroulé</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${steps}</table>`),
      `<tr><td class="px" style="padding:30px 36px 42px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="font-family:${FONT};font-size:14px;line-height:1.5;color:#a3a09b;">Particuliers et entreprises.<br>En français et en anglais.</td>
        <td align="right"><a href="mailto:${esc(v.contact)}" style="font-family:${FONT};font-size:16px;font-weight:500;color:#ff9a7f;">${esc(v.contact)}</a></td>
      </tr></table></td></tr>`,
      footer(ctx, {
        bg: "#161618", color: "#77746f", link: "#c9c5bf",
        links: [["Le desk OTC", "/otc"], ["Nous joindre", "/contact"]],
        note: "Sous 10 000 $, l'app suffit : achats et ventes jusqu'à 9 999 $ sur 24 heures.",
      }),
    ].join("");
  },
};

const entreprises: CampaignTemplate = {
  id: "entreprises",
  name: "Entreprises",
  description: "En-tête menthe avec illustration, cartes d'avantages, ouverture en trois temps. Pour les sociétés.",
  category: "Offre",
  swatch: [K.mint, K.forest],
  fields: [
    F.subject, F.preheader,
    { key: "badge", label: "Pastille", kind: "text" },
    F.headline, F.cta, F.ctaUrl,
    { key: "benefitsTitle", label: "Titre des avantages", kind: "text" },
    { key: "benefits", label: "Avantages", kind: "lines", hint: "Quatre lignes : Titre | description (la dernière est en vert foncé)" },
    { key: "stepsTitle", label: "Titre des étapes", kind: "text" },
    { key: "steps", label: "Étapes", kind: "lines", hint: "Une étape par ligne (utilisez **mot** pour le gras)" },
    { key: "cta2", label: "Bouton final", kind: "text" },
    { key: "cta2Url", label: "Lien du bouton final", kind: "url" },
  ],
  defaults: {
    subject: "Payez vos fournisseurs en USDT, au nom de votre société",
    preheader: "Le compte entreprise Ooble : Interac en dollars canadiens, 4 réseaux, desk OTC.",
    badge: "Pour les entreprises",
    headline: "Payez vos fournisseurs en USDT, au nom de votre société.",
    cta: "Ouvrir un compte entreprise",
    ctaUrl: "/inscription/entreprise",
    benefitsTitle: "Ce que votre compte entreprise vous donne",
    benefits: [
      "Au nom de la société | Chaque achat et chaque vente sont faits au nom de votre entreprise.",
      "Interac en dollars canadiens | Payez depuis le compte bancaire de l'entreprise, sans carte.",
      "4 réseaux | Tron, BNB Chain, Polygon et Solana, au choix pour chaque ordre.",
      "Gros montants | Au-delà de 10 000 $, le desk OTC vous donne un prix ferme.",
    ].join("\n"),
    stepsTitle: "L'ouverture, en trois temps",
    steps: [
      "**Le compte**, en quelques minutes : raison sociale, numéro d'entreprise et responsable.",
      "**La vérification**, depuis votre espace : documents, administrateurs et propriétaires.",
      "**L'examen** par notre équipe, en général en un jour ouvrable.",
    ].join("\n"),
    cta2: "Découvrir Ooble pour les entreprises",
    cta2Url: "/entreprises",
  },
  body: (v, ctx) => {
    const all = lines(v.benefits);
    const cells = all.map(([t, d], i) => {
      const dark = i === all.length - 1 && all.length % 2 === 0;
      return box(
        `<p style="margin:0 0 8px;font-family:${FONT};font-size:15px;font-weight:600;color:${dark ? K.cream : K.ink};">${esc(t ?? "")}</p>
         <p style="margin:0;font-family:${FONT};font-size:13px;line-height:1.5;color:${dark ? "#cfe9de" : K.body};">${rich(d, ctx)}</p>`,
        dark ? K.forest : K.cream,
      );
    });
    const steps = lines(v.steps).map(([t], i, arr) =>
      `<tr><td style="padding:16px 18px;${i < arr.length - 1 ? `border-bottom:1px solid ${K.line};` : ""}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="32" valign="middle"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="32" height="32" align="center" valign="middle" bgcolor="${K.peach}" style="width:32px;height:32px;border-radius:99px;background:${K.peach};color:${K.ink};font-family:${FONT};font-size:14px;font-weight:600;">${i + 1}</td></tr></table></td>
        <td valign="middle" style="padding-left:16px;font-family:${FONT};font-size:14px;line-height:1.5;color:${K.ink};">${rich(t, ctx)}</td>
      </tr></table></td></tr>`,
    ).join("");
    const img = image("ill:business");
    return [
      `<tr><td bgcolor="${K.mint}" style="background:${K.mint};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td class="stack-px" width="52%" valign="top" style="padding:28px 0 34px 32px;">
          ${brand(K.forest)}
          <div style="height:18px;line-height:18px;">&nbsp;</div>
          ${pill(esc(v.badge), K.forest, K.mint)}
          <div style="height:16px;line-height:16px;">&nbsp;</div>
          ${h1(rich(v.headline, ctx), K.forest, 30)}
          <div style="height:22px;line-height:22px;">&nbsp;</div>
          ${btn(v.cta, v.ctaUrl, K.forest, K.cream, { size: 14 })}
        </td>
        <td class="stack" width="48%" valign="bottom" align="center" style="padding-top:20px;"><img class="fluid" src="${img.url}" width="280" alt="${esc(img.label)}" style="display:block;width:280px;max-width:100%;height:auto;border:0;"></td>
      </tr></table></td></tr>`,
      P("34px 32px 0", `${h2(rich(v.benefitsTitle, ctx))}<div style="height:18px;line-height:18px;">&nbsp;</div>${grid(cells, 2)}`),
      P("20px 32px 0", `${h2(rich(v.stepsTitle, ctx))}<div style="height:16px;line-height:16px;">&nbsp;</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${K.line};border-radius:16px;">${steps}</table>`),
      `<tr><td class="px" align="center" style="padding:30px 32px 36px;">${btn(v.cta2, v.cta2Url, K.ink, "#ffffff")}</td></tr>`,
      footer(ctx, { bg: K.cream, color: K.mute, link: K.forest, links: [["Entreprises", "/entreprises"], ["Centre d'aide", "/faq"], ["Nous joindre", "/contact"]] }),
    ].join("");
  },
};

const lettre: CampaignTemplate = {
  id: "lettre",
  name: "Lettre du mois",
  description: "Infolettre façon magazine : sujet à la une, deux articles, chiffres en bref, conseil. Pour un envoi régulier.",
  category: "Infolettre",
  swatch: [K.cream, K.ink],
  cardBg: K.cream,
  fields: [
    F.subject, F.preheader,
    { key: "issue", label: "Numéro et mois", kind: "text" },
    { key: "tagline", label: "Sous-titre", kind: "text" },
    { key: "leadImage", label: "Image à la une", kind: "image" },
    { key: "leadBadge", label: "Pastille sur l'image", kind: "text" },
    { key: "leadTitle", label: "Titre à la une", kind: "text" },
    { key: "leadText", label: "Texte à la une", kind: "textarea" },
    { key: "leadLink", label: "Lien à la une", kind: "text" },
    { key: "leadUrl", label: "Adresse du lien à la une", kind: "url" },
    { key: "card1Image", label: "Article 1 : image", kind: "image" },
    { key: "card1", label: "Article 1", kind: "text", hint: "Étiquette | Titre | description" },
    { key: "card2Image", label: "Article 2 : image", kind: "image" },
    { key: "card2", label: "Article 2", kind: "text", hint: "Étiquette | Titre | description" },
    { key: "brief", label: "En bref", kind: "lines", hint: "Une ligne par chiffre : Chiffre | texte" },
    { key: "tip", label: "Conseil du mois", kind: "textarea" },
  ],
  defaults: {
    subject: "La Lettre d'Ooble · Octobre 2026",
    preheader: "Nos guides vidéo sont en ligne, et ce qui change ce mois-ci.",
    issue: "N° 1 · Octobre 2026",
    tagline: "Ce qui change sur Ooble, et comment en profiter. Cinq minutes de lecture.",
    leadImage: "guide:ooble-en-une-minute",
    leadBadge: "44 s",
    leadTitle: "Nos guides vidéo sont en ligne",
    leadText: "Sept vidéos de moins d'une minute, en français et en anglais : le compte, la vérification, l'achat, le paiement Interac, la vente et votre sécurité. Commencez par le tour d'Ooble en une minute.",
    leadLink: "Voir tous les guides →",
    leadUrl: "/guide",
    card1Image: "guide:acheter-usdt",
    card1: "Guide · 46 s | Acheter des USDT | Payez en dollars canadiens par Interac et recevez vos USDT dans votre wallet.",
    card2Image: "guide:vendre-usdt",
    card2: "Guide · 42 s | Vendre des USDT | Envoyez vos USDT et recevez des dollars canadiens par Interac.",
    brief: [
      "4 | réseaux pour recevoir vos USDT : **Tron, BNB Chain, Polygon et Solana**.",
      "9 999 $ | par période de 24 heures, directement dans l'app.",
      "10 000 $ | et plus : le desk OTC vous donne un prix ferme, en une fois.",
    ].join("\n"),
    tip: "Ne cliquez pas sur un lien reçu par texto : passez toujours par ooble.ca.",
  },
  body: (v, ctx) => {
    const lead = image(v.leadImage);
    const card = (imgId: string, raw: string) => {
      const [tag, title, text] = (raw ?? "").split("|").map((s) => s.trim());
      const img = image(imgId);
      const link = guideUrlFor(imgId);
      return `<a href="${href(link)}" style="text-decoration:none;color:${K.ink};"><img class="fluid" src="${img.url}" width="260" alt="${esc(img.label)}" style="display:block;width:260px;max-width:100%;height:auto;border:0;border-radius:12px;"></a>
        <p style="margin:12px 0 0;font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${K.forest};">${esc(tag ?? "")}</p>
        <p style="margin:6px 0 0;font-family:${FONT};font-size:17px;font-weight:600;line-height:1.25;"><a href="${href(link)}" style="color:${K.ink};text-decoration:none;">${esc(title ?? "")}</a></p>
        <p style="margin:6px 0 0;font-family:${FONT};font-size:13px;line-height:1.5;color:${K.body};">${rich(text, ctx)}</p>`;
    };
    const brief = lines(v.brief).map(([n, t], i, arr) =>
      `<tr><td style="padding:14px 0;${i < arr.length - 1 ? "border-bottom:1px solid #e0d9cb;" : ""}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="104" valign="top" style="font-family:${FONT};font-size:22px;font-weight:600;letter-spacing:-0.02em;color:${K.forest};white-space:nowrap;">${esc(n ?? "")}</td>
        <td valign="top" style="padding-left:12px;font-family:${FONT};font-size:14px;line-height:1.5;color:${K.ink};">${rich(t, ctx)}</td>
      </tr></table></td></tr>`,
    ).join("");
    return [
      `<tr><td class="px" style="padding:24px 32px 0;">${brand(K.ink, esc(v.issue), K.mute)}</td></tr>`,
      `<tr><td class="px" style="padding:18px 32px 22px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-bottom:2px solid ${K.ink};padding-bottom:22px;">
        <p class="big" style="margin:0;font-family:${FONT};font-size:64px;line-height:0.95;font-weight:700;letter-spacing:-0.05em;color:${K.ink};">La Lettre<span style="color:${K.coral};">.</span></p>
        ${para(rich(v.tagline, ctx), K.body, 14, "10px 0 0")}
      </td></tr></table></td></tr>`,
      P("4px 32px 0", `${eyebrow("À la une", K.coralDeep)}<div style="height:12px;line-height:12px;">&nbsp;</div>
        ${picture(lead, v.leadImage.startsWith("guide:") ? guideUrlFor(v.leadImage) : v.leadUrl, 536, { badge: v.leadBadge || undefined, badgeBg: "#ffffff", badgeFg: K.ink })}
        <div style="height:16px;line-height:16px;">&nbsp;</div>
        ${h2(rich(v.leadTitle, ctx), K.ink, 28)}
        ${para(rich(v.leadText, ctx), K.body, 15, "10px 0 0")}
        ${v.leadLink ? `<p style="margin:14px 0 0;font-family:${FONT};font-size:14px;font-weight:600;"><a href="${href(v.leadUrl)}" style="color:${K.forest};text-decoration:none;">${esc(v.leadLink)}</a></p>` : ""}`),
      P("28px 32px 0", grid([card(v.card1Image, v.card1), card(v.card2Image, v.card2)], 2, 16)),
      P("14px 32px 0", `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:2px solid ${K.ink};padding-top:16px;">${eyebrow("En bref", K.coralDeep)}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${brief}</table></td></tr></table>`),
      v.tip ? P("16px 32px 0", box(`${eyebrow("Le conseil du mois", K.sun)}${para(rich(v.tip, ctx), K.cream, 16, "8px 0 0")}`, K.ink, { pad: "22px 24px" })) : "",
      `<tr><td style="height:30px;line-height:30px;">&nbsp;</td></tr>`,
      footer(ctx, { bg: K.cream, color: K.mute, link: K.forest, top: "#e0d9cb" }),
    ].join("");
  },
};

const securite: CampaignTemplate = {
  id: "securite",
  name: "Sécurité",
  description: "En-tête pêche, vidéo et six réflexes contre les arnaques. Pour protéger les clients.",
  category: "Éducation",
  swatch: [K.peach, K.coralDeep],
  fields: [
    F.subject, F.preheader,
    { key: "headline", label: "Titre (**mot** en corail)", kind: "textarea" },
    F.intro,
    { key: "image", label: "Vidéo / image", kind: "image" },
    { key: "videoLabel", label: "Texte sur la vidéo", kind: "text" },
    { key: "reflexesTitle", label: "Titre de la liste", kind: "text" },
    { key: "reflexes", label: "Réflexes", kind: "lines", hint: "Une ligne par réflexe : Titre | description (le dernier est en noir)" },
    { key: "alert", label: "Alerte", kind: "textarea" },
    F.cta, F.ctaUrl,
  ],
  defaults: {
    subject: "Ooble ne vous demandera jamais vos codes",
    preheader: "Six réflexes contre les arnaques les plus courantes.",
    headline: "Ooble ne vous demandera **jamais** vos codes.",
    intro: "Ni mot de passe, ni code reçu par courriel ou texto. Nos courriels viennent seulement de **@ooble.ca**. Voici six réflexes contre les arnaques les plus courantes.",
    image: "guide:votre-securite",
    videoLabel: "Voir la vidéo · 50 s",
    reflexesTitle: "Les six réflexes",
    reflexes: [
      "N'achetez que pour vous | Vers un wallet qui vous appartient. Jamais pour un inconnu, même rencontré en ligne depuis longtemps.",
      "Méfiez-vous de l'urgence | Aucune administration, police ou banque ne se fait payer une amende en cryptomonnaie.",
      "Gardez vos clés secrètes | Ne partagez jamais la phrase de récupération de votre wallet : qui la connaît peut le vider.",
      "Ooble ne demande jamais vos codes | Ni mot de passe, ni code reçu par courriel ou texto.",
      "Vérifiez l'adresse et le réseau | Avant de valider un ordre : une transaction sur la blockchain est définitive.",
      "Un doute ? Écrivez-nous | Arrêtez tout et écrivez à support@ooble.ca, en français ou en anglais.",
    ].join("\n"),
    alert: "Un message pressant qui parle de crypto est presque toujours une arnaque.",
    cta: "Regarder le guide",
    ctaUrl: "/guide/votre-securite",
  },
  body: (v, ctx) => {
    const img = image(v.image);
    const all = lines(v.reflexes);
    const cells = all.map(([t, d], i) => {
      const dark = i === all.length - 1;
      return box(
        `<p style="margin:0 0 6px;font-family:${FONT};font-size:13px;font-weight:700;color:${dark ? K.coral : K.coralDeep};">${i + 1}</p>
         <p style="margin:0 0 6px;font-family:${FONT};font-size:14.5px;font-weight:600;color:${dark ? K.cream : K.ink};">${esc(t ?? "")}</p>
         <p style="margin:0;font-family:${FONT};font-size:12.5px;line-height:1.5;color:${dark ? "#c9c2b8" : K.body};">${rich(d, ctx)}</p>`,
        dark ? K.ink : "#ffffff", { border: dark ? undefined : "#f1e3dc", pad: "18px", radius: 14 },
      );
    });
    return [
      `<tr><td class="px" bgcolor="${K.peach}" style="background:${K.peach};padding:26px 32px 32px;">
        ${brand(K.ink, pill("Sécurité", "#ffffff", K.coralDeep))}
        <div style="height:22px;line-height:22px;">&nbsp;</div>
        ${h1(rich(v.headline, ctx, `color:${K.coralDeep};font-weight:700;`), K.ink, 40, 700)}
        ${para(rich(v.intro, ctx), K.ink, 15.5, "18px 0 0")}
      </td></tr>`,
      P("28px 32px 0", picture(img, guideUrlFor(v.image), 536, { badge: v.videoLabel || undefined, badgeBg: K.coral, badgeFg: "#ffffff" })),
      P("28px 32px 0", `${h2(rich(v.reflexesTitle, ctx))}<div style="height:16px;line-height:16px;">&nbsp;</div>${grid(cells, 2, 10)}`),
      v.alert ? P("10px 32px 0", box(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="28" valign="top" style="font-family:${FONT};font-size:20px;line-height:1.1;color:${K.coralDeep};">&#9888;&#xFE0E;</td>
        <td style="font-family:${FONT};font-size:14px;line-height:1.5;color:${K.ink};">${rich(v.alert, ctx)}</td></tr></table>`, "#fff1ec", { pad: "18px 20px", radius: 14 })) : "",
      `<tr><td class="px" style="padding:26px 32px 32px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td valign="middle">${btn(v.cta, v.ctaUrl, K.ink, "#ffffff")}</td>
        <td valign="middle" style="padding-left:18px;"><a href="${SITE}/faq/securite" style="font-family:${FONT};font-size:14px;font-weight:500;color:${K.coralDeep};text-decoration:underline;">Questions sur la sécurité</a></td>
      </tr></table></td></tr>`,
      footer(ctx, {
        bg: "#fff1ec", color: "#7a6a63", link: K.coralDeep,
        note: "Ce courriel ne contient aucune pièce jointe et ne vous demande aucun code.",
      }),
    ].join("");
  },
};

// ─── Nouveaux modèles ───────────────────────────────────────

const bienvenue: CampaignTemplate = {
  id: "bienvenue",
  name: "Bienvenue",
  description: "Accueil chaleureux, illustration sur fond corail, prochaines étapes et vidéo. Pour les nouveaux inscrits.",
  category: "Lancement",
  swatch: [K.coral, K.cream],
  isNew: true,
  fields: [
    F.subject, F.preheader, F.headline, F.intro,
    { key: "image", label: "Illustration", kind: "image" },
    { key: "stepsTitle", label: "Titre des étapes", kind: "text" },
    { key: "steps", label: "Étapes", kind: "lines", hint: STEPS_HINT },
    F.cta, F.ctaUrl,
    { key: "video", label: "Vidéo recommandée", kind: "image" },
    { key: "videoTitle", label: "Titre de la vidéo", kind: "text" },
  ],
  defaults: {
    subject: "Bienvenue chez Ooble, {{prenom}}",
    preheader: "Votre compte est prêt. Voici comment passer votre premier ordre.",
    headline: "Bienvenue chez Ooble, {{prenom}}.",
    intro: "Votre compte est prêt. Avec Ooble, vous achetez et vendez des USDT en dollars canadiens, par Interac, et vos USDT arrivent directement dans votre wallet.",
    image: "ill:individual",
    stepsTitle: "Vos prochaines étapes",
    steps: [
      "Vérifiez votre identité | Une seule fois : pièce d'identité et selfie. C'est une exigence de la loi canadienne.",
      "Passez un ordre | Achat ou vente, à partir de 100 $. Le taux affiché est garanti 15 minutes.",
      "Recevez directement | Vos USDT arrivent dans votre wallet, vos dollars sur votre compte bancaire.",
    ].join("\n"),
    cta: "Accéder à mon espace",
    ctaUrl: "/app",
    video: "guide:ooble-en-une-minute",
    videoTitle: "Ooble en une minute",
  },
  body: (v, ctx) => {
    const img = image(v.image);
    const vid = image(v.video);
    const steps = lines(v.steps).map(([t, d], i, arr) =>
      `<tr><td style="padding:16px 0;${i < arr.length - 1 ? `border-bottom:1px solid ${K.line};` : ""}">${numbered(String(i + 1), esc(t ?? ""), rich(d, ctx), { dotBg: K.peach, dotFg: K.ink })}</td></tr>`,
    ).join("");
    return [
      `<tr><td class="px" bgcolor="${K.coral}" style="background:${K.coral};padding:26px 32px 0;">
        ${brand(K.ink)}
        <div style="height:26px;line-height:26px;">&nbsp;</div>
        ${h1(rich(v.headline, ctx), K.ink, 42, 700)}
        ${para(rich(v.intro, ctx), K.ink, 16, "18px 0 0")}
      </td></tr>`,
      `<tr><td align="center" bgcolor="${K.coral}" style="background:${K.coral};padding:24px 32px 0;"><img class="fluid" src="${img.url}" width="360" alt="${esc(img.label)}" style="display:block;width:360px;max-width:100%;height:auto;border:0;"></td></tr>`,
      P("34px 32px 0", `${h2(rich(v.stepsTitle, ctx), K.ink, 24)}<div style="height:6px;line-height:6px;">&nbsp;</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${steps}</table>`),
      `<tr><td class="px" style="padding:20px 32px 0;">${btn(v.cta, v.ctaUrl, K.ink, "#ffffff", { block: true, size: 16 })}</td></tr>`,
      P("30px 32px 34px", box(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td class="stack" width="46%" valign="middle"><a href="${href(guideUrlFor(v.video))}"><img class="fluid" src="${vid.url}" width="220" alt="${esc(vid.label)}" style="display:block;width:220px;max-width:100%;height:auto;border:0;border-radius:12px;"></a></td>
        <td class="stack" valign="middle" style="padding-left:18px;">
          ${eyebrow("En vidéo", K.forest)}
          <p style="margin:6px 0 10px;font-family:${FONT};font-size:17px;font-weight:600;line-height:1.3;color:${K.ink};">${esc(v.videoTitle)}</p>
          <a href="${href(guideUrlFor(v.video))}" style="font-family:${FONT};font-size:14px;font-weight:600;color:${K.forest};">Regarder &#8594;</a>
        </td></tr></table>`, K.cream, { pad: "16px" })),
      footer(ctx, { bg: K.cream, color: K.mute, link: K.forest, top: K.line }),
    ].join("");
  },
};

const fondateur: CampaignTemplate = {
  id: "fondateur",
  name: "Mot de l'équipe",
  description: "Lettre sobre, sans images, signée. Pour un message personnel : nouvelles, remerciements, excuses.",
  category: "Infolettre",
  swatch: ["#ffffff", K.ink],
  isNew: true,
  fields: [
    F.subject, F.preheader,
    { key: "greeting", label: "Salutation", kind: "text" },
    { key: "message", label: "Message", kind: "textarea", hint: "Une ligne vide entre les paragraphes. **mot** pour le gras." },
    { key: "ps", label: "P.-S. (facultatif)", kind: "textarea" },
    { key: "signature", label: "Signature", kind: "text" },
    { key: "role", label: "Fonction", kind: "text" },
    { key: "cta", label: "Lien (facultatif)", kind: "text" },
    F.ctaUrl,
  ],
  defaults: {
    subject: "Un mot de l'équipe Ooble",
    preheader: "Merci d'être parmi nos premiers clients.",
    greeting: "Bonjour {{prenom}},",
    message: [
      "Merci d'avoir créé votre compte sur Ooble.",
      "Nous avons construit Ooble pour une chose simple : acheter et vendre des USDT en dollars canadiens, par Interac, sans que personne ne garde votre argent. Chaque ordre est réglé individuellement, puis fermé.",
      "Nous lisons chaque message. Si quelque chose vous bloque, ou si vous avez une idée pour améliorer le service, répondez simplement à ce courriel : c'est notre équipe qui vous répondra, en français ou en anglais.",
    ].join("\n\n"),
    ps: "Nos guides vidéo de moins d'une minute répondent aux questions les plus fréquentes : ooble.ca/guide",
    signature: "L'équipe Ooble",
    role: "Montréal, Canada",
    cta: "",
    ctaUrl: "",
  },
  body: (v, ctx) => {
    const paras = (v.message ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
      .map((p) => para(rich(p, ctx), "#2b2724", 16.5, "0 0 18px")).join("");
    return [
      P("34px 48px 0", `<img src="${LOGO}" width="36" height="36" alt="Ooble" style="display:block;border-radius:10px;border:0;">`),
      P("34px 48px 8px", `${para(rich(v.greeting, ctx), K.ink, 16.5, "0 0 22px")}${paras}`),
      v.cta ? P("4px 48px 10px", `<a href="${href(v.ctaUrl)}" style="font-family:${FONT};font-size:16px;font-weight:600;color:${K.forest};text-decoration:underline;">${esc(v.cta)}</a>`) : "",
      P("18px 48px 0", `<p style="margin:0;font-family:${FONT};font-size:16.5px;font-weight:600;color:${K.ink};">${rich(v.signature, ctx)}</p><p style="margin:2px 0 0;font-family:${FONT};font-size:14px;color:${K.mute};">${rich(v.role, ctx)}</p>`),
      v.ps ? P("26px 48px 0", `<p style="margin:0;padding-top:18px;border-top:1px solid ${K.line};font-family:${FONT};font-size:14px;line-height:1.6;color:${K.body};"><strong style="color:${K.ink};">P.-S.</strong> ${rich(v.ps, ctx)}</p>`) : "",
      `<tr><td style="height:36px;line-height:36px;">&nbsp;</td></tr>`,
      footer(ctx, { bg: "#ffffff", color: "#8a8379", link: K.ink, top: K.line }),
    ].join("");
  },
};

const nouveaute: CampaignTemplate = {
  id: "nouveaute",
  name: "Nouveauté",
  description: "Grande image, titre et un seul bouton. Le modèle libre pour annoncer n'importe quelle nouveauté.",
  category: "Lancement",
  swatch: [K.ink, K.mint],
  isNew: true,
  fields: [
    F.subject, F.preheader,
    { key: "eyebrow", label: "Sur-titre", kind: "text" },
    F.headline,
    { key: "image", label: "Image", kind: "image" },
    { key: "message", label: "Texte", kind: "textarea", hint: "Une ligne vide entre les paragraphes." },
    { key: "points", label: "Points clés (facultatif)", kind: "lines", hint: "Un point par ligne" },
    F.cta, F.ctaUrl,
  ],
  defaults: {
    subject: "Nouveau sur Ooble : la vente de USDT",
    preheader: "Envoyez vos USDT, recevez des dollars canadiens par Interac.",
    eyebrow: "Nouveau",
    headline: "Vendez vos USDT, recevez des dollars par Interac.",
    image: "guide:vendre-usdt",
    message: "Dans l'onglet Vendre, entrez le montant, choisissez le réseau et l'adresse courriel Interac où recevoir votre virement. Dès confirmation sur la blockchain, vos dollars partent.",
    points: [
      "À partir de 100 $ par vente",
      "Sur Tron, BNB Chain, Polygon ou Solana",
      "Virement Interac e-Transfer en dollars canadiens",
    ].join("\n"),
    cta: "Vendre des USDT",
    ctaUrl: "/app/vendre",
  },
  body: (v, ctx) => {
    const img = image(v.image);
    const paras = (v.message ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
      .map((p) => para(rich(p, ctx), "#cfcac2", 16, "0 0 14px")).join("");
    const points = lines(v.points).map(([t]) =>
      `<tr><td width="22" valign="top" style="font-family:${FONT};font-size:15px;line-height:1.5;color:${K.mint};">&#10003;</td><td style="padding:0 0 10px 6px;font-family:${FONT};font-size:15px;line-height:1.5;color:#f4f2ee;">${rich(t, ctx)}</td></tr>`,
    ).join("");
    return [
      P("26px 32px 0", brand("#f4f2ee", pill(esc(v.eyebrow), K.mint, K.ink))),
      P("30px 32px 26px", h1(rich(v.headline, ctx), "#f4f2ee", 40)),
      P("0 32px", picture(img, img.id.startsWith("guide:") ? guideUrlFor(img.id) : v.ctaUrl, 536, { radius: 18 })),
      P("28px 32px 0", paras),
      points ? P("4px 32px 0", `<table role="presentation" cellpadding="0" cellspacing="0" border="0">${points}</table>`) : "",
      `<tr><td class="px" style="padding:22px 32px 40px;">${btn(v.cta, v.ctaUrl, K.mint, K.ink)}</td></tr>`,
      footer(ctx, { bg: "#1d1a18", color: "#8c867e", link: K.mint }),
    ].join("");
  },
  cardBg: K.ink,
};

const retour: CampaignTemplate = {
  id: "retour",
  name: "On vous attend",
  description: "Ton amical, fond sauge, liste de ce qui a changé. Pour les clients qui ne sont pas revenus depuis un moment.",
  category: "Relance",
  swatch: [K.sage, K.ink],
  isNew: true,
  fields: [
    F.subject, F.preheader, F.headline, F.intro,
    { key: "image", label: "Illustration", kind: "image" },
    { key: "newsTitle", label: "Titre de la liste", kind: "text" },
    { key: "news", label: "Nouveautés", kind: "lines", hint: "Une ligne par nouveauté : Titre | description" },
    F.cta, F.ctaUrl,
  ],
  defaults: {
    subject: "{{prenom}}, voici ce qui a changé sur Ooble",
    preheader: "Guides vidéo, 4 réseaux, desk OTC : tout ce qui est nouveau depuis votre dernière visite.",
    headline: "Ça fait un moment, {{prenom}}.",
    intro: "Depuis votre dernière visite, nous avons amélioré Ooble. Voici l'essentiel, en trente secondes.",
    image: "ill:login",
    newsTitle: "Ce qui a changé",
    news: [
      "Des guides vidéo | Sept vidéos de moins d'une minute pour tout faire sans erreur.",
      "4 réseaux | Recevez vos USDT sur Tron, BNB Chain, Polygon ou Solana.",
      "Le desk OTC | À partir de 10 000 $, un prix ferme et un seul interlocuteur.",
    ].join("\n"),
    cta: "Revenir sur Ooble",
    ctaUrl: "/connexion",
  },
  body: (v, ctx) => {
    const img = image(v.image);
    const news = lines(v.news).map(([t, d], i, arr) =>
      `<tr><td style="padding:16px 0;${i < arr.length - 1 ? `border-bottom:1px solid ${K.line};` : ""}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="12" valign="top" style="padding-top:7px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="10" height="10" bgcolor="${K.sage}" style="width:10px;height:10px;border-radius:99px;background:${K.sage};font-size:0;line-height:0;">&nbsp;</td></tr></table></td>
        <td valign="top" style="padding-left:14px;"><p style="margin:0;font-family:${FONT};font-size:16px;font-weight:600;color:${K.ink};">${esc(t ?? "")}</p><p style="margin:3px 0 0;font-family:${FONT};font-size:14px;line-height:1.55;color:${K.body};">${rich(d, ctx)}</p></td>
      </tr></table></td></tr>`,
    ).join("");
    return [
      `<tr><td bgcolor="${K.sage}" style="background:${K.sage};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td class="stack-px" width="56%" valign="top" style="padding:28px 0 30px 32px;">
          ${brand(K.ink)}
          <div style="height:26px;line-height:26px;">&nbsp;</div>
          ${h1(rich(v.headline, ctx), K.ink, 36, 700)}
          ${para(rich(v.intro, ctx), K.ink, 15.5, "16px 0 0")}
        </td>
        <td class="stack" width="44%" valign="bottom" align="center" style="padding:20px 12px 0 0;"><img class="fluid" src="${img.url}" width="240" alt="${esc(img.label)}" style="display:block;width:240px;max-width:100%;height:auto;border:0;"></td>
      </tr></table></td></tr>`,
      P("32px 32px 0", `${eyebrow(esc(v.newsTitle), K.forest)}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${news}</table>`),
      `<tr><td class="px" style="padding:20px 32px 38px;">${btn(v.cta, v.ctaUrl, K.forest, K.cream)}</td></tr>`,
      footer(ctx, { bg: K.cream, color: K.mute, link: K.forest }),
    ].join("");
  },
};

const vendre: CampaignTemplate = {
  id: "vendre",
  name: "Vendre des USDT",
  description: "Fond menthe et étapes numérotées sur la vidéo. Pour pousser la vente de USDT contre des dollars.",
  category: "Offre",
  swatch: [K.mint, K.coral],
  isNew: true,
  fields: [
    F.subject, F.preheader, F.headline, F.intro,
    { key: "image", label: "Vidéo / image", kind: "image" },
    { key: "steps", label: "Étapes", kind: "lines", hint: STEPS_HINT },
    { key: "tip", label: "Conseil", kind: "textarea" },
    F.cta, F.ctaUrl,
  ],
  defaults: {
    subject: "Vos USDT en dollars canadiens, par Interac",
    preheader: "Vendez vos USDT en quelques étapes, à partir de 100 $.",
    headline: "Vos USDT deviennent des dollars, sur votre compte.",
    intro: "Envoyez vos USDT et recevez des dollars canadiens par virement Interac e-Transfer, à partir de 100 $ par vente.",
    image: "guide:vendre-usdt",
    steps: [
      "Entrez le montant | Dans l'onglet Vendre. Le montant en dollars s'affiche automatiquement.",
      "Indiquez où recevoir vos dollars | L'adresse courriel Interac de votre virement, avec la question et la réponse de sécurité.",
      "Envoyez vos USDT | Le montant exact, uniquement sur le réseau indiqué, puis confirmez l'envoi.",
      "Recevez vos dollars | Dès confirmation sur la blockchain, par virement Interac e-Transfer.",
    ].join("\n"),
    tip: "Si vous envoyez depuis une plateforme d'échange, ajoutez ses frais de retrait : le montant reçu doit être exact.",
    cta: "Vendre des USDT",
    ctaUrl: "/app/vendre",
  },
  body: (v, ctx) => {
    const img = image(v.image);
    const steps = lines(v.steps).map(([t, d], i) =>
      `<tr><td style="padding-bottom:18px;">${numbered(String(i + 1), esc(t ?? ""), rich(d, ctx), { dotBg: K.coral, dotFg: K.ink })}</td></tr>`,
    ).join("");
    return [
      `<tr><td class="px" bgcolor="${K.mint}" style="background:${K.mint};padding:26px 32px 30px;">
        ${brand(K.forest, pill("Vendre", K.forest, K.mint))}
        <div style="height:24px;line-height:24px;">&nbsp;</div>
        ${h1(rich(v.headline, ctx), K.forest, 40)}
        ${para(rich(v.intro, ctx), K.forest, 16, "16px 0 24px")}
        ${picture(img, guideUrlFor(v.image), 536, { radius: 16 })}
      </td></tr>`,
      P("34px 32px 0", `${h2("En quatre étapes")}<div style="height:18px;line-height:18px;">&nbsp;</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${steps}</table>`),
      v.tip ? P("0 32px", box(para(`<strong style="color:${K.ink};">Conseil :</strong> ${rich(v.tip, ctx)}`, K.body, 14), K.cream, { pad: "18px 20px" })) : "",
      `<tr><td class="px" style="padding:26px 32px 36px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td valign="middle">${btn(v.cta, v.ctaUrl, K.forest, K.cream)}</td>
        <td align="right" valign="middle" class="hide-m">${networksRow(30)}</td>
      </tr></table></td></tr>`,
      footer(ctx, { bg: K.forest, color: "#a9d3c1", link: K.mint, links: [["Questions sur la vente", "/faq/vendre"], ["Nous joindre", "/contact"]] }),
    ].join("");
  },
};

const avis: CampaignTemplate = {
  id: "avis",
  name: "Avis de service",
  description: "Sobre et clair : date, heure, ce qui change. Pour une maintenance, un changement de règle ou un avis important.",
  category: "Infolettre",
  swatch: [K.cream, K.forest],
  isNew: true,
  cardBg: "#ffffff",
  fields: [
    F.subject, F.preheader,
    { key: "label", label: "Étiquette", kind: "text" },
    F.headline,
    { key: "when", label: "Quand", kind: "lines", hint: "Une ligne par info : Libellé | valeur" },
    { key: "message", label: "Explication", kind: "textarea", hint: "Une ligne vide entre les paragraphes." },
    { key: "impact", label: "Ce que vous devez faire", kind: "lines", hint: "Un point par ligne" },
    F.cta, F.ctaUrl,
  ],
  defaults: {
    subject: "Maintenance prévue de la plateforme Ooble",
    preheader: "Ooble sera indisponible pendant une courte période.",
    label: "Avis de service",
    headline: "Maintenance prévue de la plateforme",
    when: [
      "Date | Dimanche 19 octobre 2026",
      "Heure | De 2 h à 4 h (heure de l'Est)",
      "Durée prévue | Environ 2 heures",
    ].join("\n"),
    message: "Pendant cette période, il ne sera pas possible de passer de nouveaux ordres. Les ordres déjà payés seront traités dès la fin de la maintenance.",
    impact: [
      "Évitez d'envoyer un virement Interac pendant la maintenance.",
      "Si un ordre est en cours, terminez-le avant 2 h.",
    ].join("\n"),
    cta: "Nous joindre",
    ctaUrl: "/contact",
  },
  body: (v, ctx) => {
    const when = lines(v.when).map(([l, val], i, arr) =>
      `<tr><td style="padding:12px 0;${i < arr.length - 1 ? `border-bottom:1px solid #e0d9cb;` : ""}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="40%" style="font-family:${FONT};font-size:13px;color:${K.mute};">${esc(l ?? "")}</td>
        <td style="font-family:${FONT};font-size:15px;font-weight:600;color:${K.ink};">${rich(val, ctx)}</td>
      </tr></table></td></tr>`,
    ).join("");
    const paras = (v.message ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
      .map((p) => para(rich(p, ctx), K.body, 15.5, "0 0 14px")).join("");
    const impact = lines(v.impact).map(([t]) =>
      `<tr><td width="20" valign="top" style="font-family:${FONT};font-size:15px;line-height:1.5;color:${K.forest};font-weight:700;">&#8594;</td><td style="padding:0 0 8px 8px;font-family:${FONT};font-size:15px;line-height:1.5;color:${K.ink};">${rich(t, ctx)}</td></tr>`,
    ).join("");
    return [
      `<tr><td class="px" style="padding:26px 36px;border-bottom:1px solid ${K.line};">${brand(K.ink, esc(v.label).toUpperCase(), K.forest, "font-weight:600;letter-spacing:0.12em;")}</td></tr>`,
      P("34px 36px 0", h1(rich(v.headline, ctx), K.ink, 32)),
      P("24px 36px 0", box(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${when}</table>`, K.cream, { pad: "8px 22px" })),
      P("26px 36px 0", paras),
      impact ? P("6px 36px 0", `${eyebrow("Ce que vous devez faire", K.forest)}<div style="height:12px;line-height:12px;">&nbsp;</div><table role="presentation" cellpadding="0" cellspacing="0" border="0">${impact}</table>`) : "",
      `<tr><td class="px" style="padding:22px 36px 38px;">${btn(v.cta, v.ctaUrl, K.ink, "#ffffff")}</td></tr>`,
      footer(ctx, { bg: K.cream, color: K.mute, link: K.forest }),
    ].join("");
  },
};

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  lancement, guideInterac, relanceKyc, reseaux, otc, entreprises, lettre, securite,
  bienvenue, fondateur, nouveaute, retour, vendre, avis,
];

export function getTemplate(id: string): CampaignTemplate {
  return CAMPAIGN_TEMPLATES.find((t) => t.id === id) ?? CAMPAIGN_TEMPLATES[0];
}

/** Courriel complet prêt à envoyer. */
export function renderTemplate(id: string, values: TemplateValues, ctx: RenderCtx): { subject: string; html: string; text: string } {
  const t = getTemplate(id);
  const v = { ...t.defaults, ...values };
  const html = documentHtml(plainText(v.preheader ?? "", ctx), t.cardBg ?? "#ffffff", t.body(v, ctx));
  return { subject: plainText(v.subject ?? "", ctx), html, text: htmlToText(html) };
}

/** Version texte (clients sans HTML, filtres anti-pourriel). */
export function htmlToText(html: string): string {
  return html
    .replace(/<head[\s\S]*?<\/head>/i, "")
    .replace(/<div style="display:none[\s\S]*?<\/div>/i, "")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, url: string, label: string) => {
      const l = label.replace(/<[^>]+>/g, "").trim();
      return l ? `${l} (${url.replace(/^mailto:/, "")})` : "";
    })
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h1|h2|tr|table)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#\d+;|&\w+;/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*(\n\s*)+/g, "\n\n")
    .split("\n").map((l) => l.trim()).join("\n")
    .trim();
}
