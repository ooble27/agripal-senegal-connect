// Génère les templates e-mail Ooble (avec {{variables}}) + une galerie de
// prévisualisation (données d'exemple). Usage : node emails/tools/build.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { layout, notice, C } from "./components.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const tplDir = resolve(root, "templates");
const prevDir = resolve(root, "preview");
mkdirSync(tplDir, { recursive: true });
mkdirSync(prevDir, { recursive: true });

/** Remplace {{clé}} par la valeur ; laisse les clés inconnues intactes. */
const renderVars = (str, data) =>
  str.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in data ? data[k] : m));

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const p = (html) => `<p style="margin:0 0 14px;font-family:${FONT};font-size:15px;line-height:1.6;color:${C.text};">${html}</p>`;
const mono = (val) => `<span style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:14px;color:${C.ink};font-weight:600;word-break:break-all;">${val}</span>`;
const bold = (val) => `<strong style="color:${C.ink};font-weight:700;">${val}</strong>`;

/* ------------------------------------------------------------------ */
/*  Définition des templates                                          */
/* ------------------------------------------------------------------ */

const templates = [
  {
    name: "welcome",
    subject: "Bienvenue sur Ooble",
    sample: { firstName: "Amélie", verifyUrl: "#" },
    html: layout({
      illustration: "welcome",
      alt: "Bienvenue",
      eyebrow: "Bienvenue",
      title: "Bienvenue sur Ooble, {{firstName}}",
      intro:
        "Votre compte est créé. Ooble vous permet d'acheter et vendre de l'USDT en dollars canadiens, réglé par Interac e-Transfer — de façon simple, rapide et non-custodial.",
      contentHtml:
        p(`${bold("USDT uniquement")} — recevez ou envoyez sur 6 réseaux au choix.`) +
        p(`${bold("Paiement par Interac e-Transfer")} — simple et rapide, en dollars canadiens.`) +
        p(`${bold("Non-custodial")} — vos clés, vos fonds. Ooble ne conserve jamais vos USDT.`) +
        p("Confirmez votre adresse e-mail pour activer toutes les fonctionnalités :"),
      cta: { label: "Vérifier mon adresse", href: "{{verifyUrl}}" },
      preheader: "Votre compte Ooble est prêt — confirmez votre adresse e-mail.",
    }),
  },

  {
    name: "order-buy",
    subject: "Votre ordre d'achat Ooble ({{ref}})",
    sample: {
      ref: "OOB-9QX3M1", cadAmount: "500,00", usdtAmount: "349,65",
      network: "Tron · TRC-20", interacRecipient: "oobletechnologiesinc@gmail.com", orderUrl: "#",
    },
    html: layout({
      illustration: "buy",
      alt: "Ordre d'achat",
      eyebrow: "Ordre d'achat créé",
      title: "Payez par Interac pour recevoir vos USDT",
      intro:
        "Envoyez un virement Interac e-Transfer avec les informations ci-dessous. Dès réception, nous envoyons vos USDT à votre adresse.",
      contentHtml:
        p(`Votre référence : ${mono("{{ref}}")}.`) +
        p(`Montant à payer : ${bold("{{cadAmount}} CAD")} — vous recevrez ${bold("{{usdtAmount}} USDT")} sur le réseau ${bold("{{network}}")}.`) +
        p(`Envoyez votre e-Transfer à : ${mono("{{interacRecipient}}")}.`) +
        notice(
          "Indiquez la référence <strong>{{ref}}</strong> dans le message de votre e-Transfer. Le taux est garanti 15 minutes.",
        ),
      cta: { label: "Voir ma commande", href: "{{orderUrl}}" },
      preheader: "Réglez {{cadAmount}} CAD par Interac pour recevoir {{usdtAmount}} USDT.",
    }),
  },

  {
    name: "order-sell",
    subject: "Votre ordre de vente Ooble ({{ref}})",
    sample: {
      ref: "OOB-7K2P4A", usdtAmount: "500,00", cadAmount: "715,00",
      network: "Tron · TRC-20", depositAddress: "TXhÀ générer après confirmation", orderUrl: "#",
    },
    html: layout({
      illustration: "sell",
      alt: "Ordre de vente",
      eyebrow: "Ordre de vente créé",
      title: "Envoyez vos USDT pour recevoir vos dollars",
      intro:
        "Transférez vos USDT à l'adresse de dépôt ci-dessous. Dès confirmation sur la blockchain, vous recevez vos CAD par Interac e-Transfer.",
      contentHtml:
        p(`Votre référence : ${mono("{{ref}}")}.`) +
        p(`Vous envoyez ${bold("{{usdtAmount}} USDT")} et recevrez ${bold("{{cadAmount}} CAD")} par Interac e-Transfer.`) +
        p(`Réseau : ${bold("{{network}}")}.`) +
        p(`Adresse de dépôt :<br />${mono("{{depositAddress}}")}`) +
        notice("Envoyez uniquement de l'USDT sur le réseau <strong>{{network}}</strong>. Un autre réseau entraînerait la perte des fonds."),
      cta: { label: "Voir ma commande", href: "{{orderUrl}}" },
      preheader: "Envoyez {{usdtAmount}} USDT pour recevoir {{cadAmount}} CAD par Interac.",
    }),
  },

  {
    name: "payment-received",
    subject: "Paiement reçu — on traite votre commande ({{ref}})",
    sample: { ref: "OOB-9QX3M1", amount: "500,00 CAD", usdtAmount: "349,65", orderUrl: "#" },
    html: layout({
      illustration: "received",
      alt: "Paiement reçu",
      eyebrow: "Paiement reçu",
      title: "Nous avons bien reçu votre paiement",
      intro:
        "Merci ! Votre paiement de {{amount}} est confirmé. Notre équipe traite votre commande — vous recevrez vos {{usdtAmount}} USDT très bientôt.",
      contentHtml:
        p(`Référence : ${mono("{{ref}}")}.`) +
        p(`Montant reçu : ${bold("{{amount}}")}. Nous préparons l'envoi de ${bold("{{usdtAmount}} USDT")} à votre adresse.`) +
        p(`Statut : ${bold("En traitement")} — vous serez notifié dès que vos USDT seront envoyés.`),
      cta: { label: "Suivre ma commande", href: "{{orderUrl}}" },
      preheader: "Paiement de {{amount}} confirmé — traitement en cours.",
    }),
  },

  {
    name: "order-completed",
    subject: "Transaction terminée ({{ref}})",
    sample: {
      ref: "OOB-9QX3M1", summaryLabel: "USDT envoyés", summaryValue: "349,65 USDT",
      network: "Tron · TRC-20", txHash: "3f9a…7c21", orderUrl: "#",
    },
    html: layout({
      illustration: "completed",
      alt: "Transaction terminée",
      eyebrow: "Terminé",
      title: "Votre transaction est terminée",
      intro: "C'est réglé. Merci d'avoir utilisé Ooble — voici le récapitulatif de votre transaction.",
      contentHtml:
        p(`Référence : ${mono("{{ref}}")}.`) +
        p(`{{summaryLabel}} : ${bold("{{summaryValue}}")} sur le réseau ${bold("{{network}}")}.`) +
        p(`Transaction :<br />${mono("{{txHash}}")}`),
      cta: { label: "Voir le reçu", href: "{{orderUrl}}" },
      preheader: "Transaction {{ref}} terminée avec succès.",
    }),
  },

  {
    name: "newsletter",
    subject: "{{subjectLine}}",
    sample: {
      subjectLine: "Ooble s'améliore — voici les nouveautés",
      eyebrow: "Nouveautés",
      headline: "Du nouveau chez Ooble",
      bodyIntro:
        "On a travaillé fort pour rendre l'achat et la vente d'USDT encore plus simples au Canada. Voici ce qui change ce mois-ci.",
      bodyHtml:
        "<strong>Réglages plus rapides</strong> — vos commandes sont traitées plus vite que jamais.<br /><br /><strong>6 réseaux</strong> — recevez vos USDT sur le réseau de votre choix, aux frais les plus bas.",
      ctaLabel: "Découvrir",
      ctaUrl: "#",
    },
    html: layout({
      illustration: "news",
      alt: "Nouveautés Ooble",
      marketing: true,
      eyebrow: "{{eyebrow}}",
      title: "{{headline}}",
      intro: "{{bodyIntro}}",
      contentHtml: p("{{bodyHtml}}"),
      cta: { label: "{{ctaLabel}}", href: "{{ctaUrl}}" },
      preheader: "{{bodyIntro}}",
    }),
  },
];

/* ------------------------------------------------------------------ */
/*  Écriture des fichiers                                             */
/* ------------------------------------------------------------------ */

const previewCommon = { assetBase: "../assets", year: "2026", unsubscribeUrl: "#" };
const cards = [];

for (const t of templates) {
  // Template source (placeholders conservés)
  writeFileSync(resolve(tplDir, `${t.name}.html`), t.html, "utf8");

  // Prévisualisation (données d'exemple remplies)
  const preview = renderVars(t.html, { ...previewCommon, ...t.sample });
  writeFileSync(resolve(prevDir, `${t.name}.html`), preview, "utf8");

  cards.push(`
    <figure style="margin:0;">
      <figcaption style="font:600 14px/1.4 ${FONT};color:#14201f;margin:0 0 8px;">
        ${t.name}<span style="color:#8a97a0;font-weight:400;"> — ${t.subject.replace(/\{\{\w+\}\}/g, "…")}</span>
      </figcaption>
      <iframe src="./${t.name}.html" style="width:100%;height:820px;border:1px solid #E4EAEA;border-radius:16px;background:#EEF2F2;"></iframe>
    </figure>`);
}

// Bundle pour la fonction edge (source de vérité unique).
const funcDir = resolve(root, "..", "supabase", "functions", "send-email");
mkdirSync(funcDir, { recursive: true });
const bundle = {
  TEMPLATES: Object.fromEntries(templates.map((t) => [t.name, t.html])),
  SUBJECTS: Object.fromEntries(templates.map((t) => [t.name, t.subject])),
};
writeFileSync(
  resolve(funcDir, "templates.ts"),
  "// Généré par emails/tools/build.mjs — ne pas éditer à la main.\n" +
    "export const TEMPLATES: Record<string, string> = " + JSON.stringify(bundle.TEMPLATES, null, 2) + ";\n\n" +
    "export const SUBJECTS: Record<string, string> = " + JSON.stringify(bundle.SUBJECTS, null, 2) + ";\n",
  "utf8",
);

const gallery = `<!doctype html><html lang="fr"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Ooble — aperçu des e-mails</title></head>
<body style="margin:0;background:#fff;padding:28px 20px;font-family:${FONT};">
  <h1 style="font:800 26px/1.2 ${FONT};color:#0F3A43;margin:0 0 4px;">ooble<span style="color:#2FA39B;">.</span> — templates e-mail</h1>
  <p style="color:#475467;margin:0 0 24px;font-size:14px;">Transactionnels &amp; marketing. Illustrations originales, style de la landing.</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:24px;">
    ${cards.join("\n")}
  </div>
</body></html>`;
writeFileSync(resolve(prevDir, "index.html"), gallery, "utf8");

console.log("✓", templates.length, "templates écrits dans emails/templates/ et emails/preview/");
