// Templates transactionnels Ooble.
//
// Refonte pour utiliser le même layout monochrome sobre que les envois
// libres du back-office (voir `layout.ts`). Chaque template = une suite
// d'appels aux primitives partagées (eyebrow/heading/lead/dataRows/
// primaryButton/notice) enveloppés dans `wrapCustomBody` — plus de style
// dupliqué, plus d'accents teal, un rendu cohérent entre transactionnel
// et messages écrits à la main.

import {
  wrapCustomBody, eyebrow, heading, lead, dataRows, primaryButton, notice,
} from "./layout.ts";

const ASSET_BASE = ""; // les templates n'utilisent pas d'assets externes

function template(inner: string): string {
  return wrapCustomBody({ bodyHtml: inner, assetBase: ASSET_BASE });
}

export const TEMPLATES: Record<string, string> = {
  welcome: template(
    eyebrow("Bienvenue") +
    heading("Bienvenue sur Ooble, {{firstName}}") +
    lead("Votre compte est créé. Vous pouvez acheter et vendre de l'USDT en dollars canadiens, réglé par Interac e-Transfer, de façon simple, rapide et non-custodial.") +
    dataRows([
      ["USDT",       "6 réseaux au choix"],
      ["Paiement",   "Interac e-Transfer"],
      ["Modèle",     "Non-custodial"],
    ]) +
    primaryButton("{{verifyUrl}}", "Vérifier mon adresse"),
  ),

  "order-buy": template(
    eyebrow("Ordre d'achat") +
    heading("Payez par Interac pour recevoir vos USDT") +
    lead("Envoyez un virement Interac e-Transfer avec les informations ci-dessous. Dès réception, nous envoyons vos USDT à l'adresse que vous nous avez indiquée.") +
    dataRows([
      ["Référence",           "{{ref}}",                true],
      ["Montant à payer",     "{{cadAmount}} CAD"],
      ["Vous recevrez",       "{{usdtAmount}} USDT"],
      ["Réseau",              "{{network}}"],
      ["Adresse de réception","{{receptionAddress}}",   true],
    ]) +
    primaryButton("{{orderUrl}}", "Voir ma commande"),
  ),

  "order-sell": template(
    eyebrow("Ordre de vente") +
    heading("Envoyez vos USDT pour recevoir vos dollars") +
    lead("Transférez vos USDT à l'adresse ci-dessous. Dès confirmation sur la blockchain, vous recevez vos CAD par Interac e-Transfer.") +
    dataRows([
      ["Référence",         "{{ref}}",            true],
      ["Vous envoyez",      "{{usdtAmount}} USDT"],
      ["Vous recevrez",     "{{cadAmount}} CAD"],
      ["Réseau",            "{{network}}"],
      ["Adresse de dépôt",  "{{depositAddress}}", true],
    ]) +
    notice("Envoyez uniquement de l'USDT sur le réseau <strong>{{network}}</strong>. Un autre réseau entraînerait la perte des fonds.") +
    primaryButton("{{orderUrl}}", "Voir ma commande"),
  ),

  "payment-received": template(
    eyebrow("Paiement reçu") +
    heading("Nous avons bien reçu votre paiement") +
    lead("Votre paiement est confirmé. Notre équipe traite votre commande. Vous recevrez vos USDT très bientôt.") +
    dataRows([
      ["Référence",     "{{ref}}",             true],
      ["Montant reçu",  "{{amount}}"],
      ["Vous recevrez", "{{usdtAmount}} USDT"],
      ["Statut",        "En traitement"],
    ]) +
    primaryButton("{{orderUrl}}", "Suivre ma commande"),
  ),

  "order-completed": template(
    eyebrow("Terminé") +
    heading("Votre transaction est terminée") +
    lead("C'est réglé. Voici le récapitulatif de votre transaction.") +
    dataRows([
      ["Référence",           "{{ref}}",          true],
      ["{{summaryLabel}}",    "{{summaryValue}}"],
      ["Réseau",              "{{network}}"],
      ["Hash de transaction", "{{txHash}}",       true],
    ]) +
    primaryButton("{{orderUrl}}", "Voir le reçu"),
  ),

  newsletter: template(
    eyebrow("{{eyebrow}}") +
    heading("{{headline}}") +
    lead("{{bodyIntro}}") +
    `<div style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#333;">{{bodyHtml}}</div>` +
    primaryButton("{{ctaUrl}}", "{{ctaLabel}}"),
  ),
};

export const SUBJECTS: Record<string, string> = {
  welcome:            "Bienvenue sur Ooble",
  "order-buy":        "Votre ordre d'achat Ooble ({{ref}})",
  "order-sell":       "Votre ordre de vente Ooble ({{ref}})",
  "payment-received": "Paiement reçu, on traite votre commande ({{ref}})",
  "order-completed":  "Transaction terminée ({{ref}})",
  newsletter:         "{{subjectLine}}",
};
