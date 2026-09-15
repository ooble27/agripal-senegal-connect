# E-mails Ooble

Templates transactionnels & marketing, dans le style de la landing (illustrations
originales, palette petrol / teal / encre / jaune). HTML « bulletproof » (tables +
styles inline) compatible Gmail, Outlook, Apple Mail, etc.

## Structure

```
emails/
├── assets/            PNG des illustrations (à héberger publiquement)
├── templates/         Templates HTML avec {{variables}}  ← source de vérité
├── preview/           Versions remplies d'exemple + index.html (galerie)
└── tools/
    ├── illustration-sheet.html   illustrations SVG (JS)
    ├── render.mjs                SVG → PNG (Playwright)
    ├── components.mjs            système de design (layout, boutons, cartes)
    └── build.mjs                 génère templates/, preview/, et le bundle edge
```

## Commandes

```bash
# 1. (Re)générer les illustrations PNG depuis les SVG
node emails/tools/render.mjs

# 2. (Re)générer les templates + la galerie de prévisualisation + le bundle edge
node emails/tools/build.mjs

# 3. Prévisualiser : ouvrir emails/preview/index.html dans un navigateur
```

`build.mjs` écrit aussi `supabase/functions/send-email/templates.ts` (bundle utilisé
par la fonction edge) — **une seule source de vérité**.

## Templates disponibles

| Nom               | Type            | Illustration | Variables principales |
|-------------------|-----------------|--------------|-----------------------|
| `welcome`         | transactionnel  | rosette      | `firstName`, `verifyUrl` |
| `order-buy`       | transactionnel  | ticket       | `ref`, `cadAmount`, `usdtAmount`, `network`, `interacRecipient`, `orderUrl` |
| `order-sell`      | transactionnel  | dépôt        | `ref`, `usdtAmount`, `cadAmount`, `network`, `depositAddress`, `orderUrl` |
| `payment-received`| transactionnel  | cercle ✓     | `ref`, `amount`, `usdtAmount`, `orderUrl` |
| `order-completed` | transactionnel  | sceau        | `ref`, `summaryLabel`, `summaryValue`, `network`, `txHash`, `orderUrl` |
| `newsletter`      | marketing       | mégaphone    | `subjectLine`, `eyebrow`, `headline`, `bodyIntro`, `bodyHtml`, `ctaLabel`, `ctaUrl` |

Variables injectées automatiquement par la fonction edge : `assetBase`, `year`,
`unsubscribeUrl`.

## Envoi (fonction edge `send-email` + Resend)

Depuis le front :

```ts
import { sendEmail } from "@/lib/email";

await sendEmail({
  to: "client@exemple.ca",
  template: "order-buy",
  vars: { ref: "OOB-9QX3M1", cadAmount: "500,00", usdtAmount: "349,65",
          network: "Tron · TRC-20", interacRecipient: "oobletechnologiesinc@gmail.com",
          orderUrl: "https://ooble.ca/app" },
});
```

## Configuration Resend — à faire quand le domaine sera acheté

> Tant qu'aucun domaine n'est vérifié, la fonction se déploie mais l'envoi échoue
> (Resend exige un `from` sur domaine vérifié). Pour un test rapide, Resend fournit
> `onboarding@resend.dev` (envoi limité à votre propre adresse).

1. **Acheter le domaine** (ex. `ooble.ca`) chez GoDaddy.
2. **Resend → Domains → Add Domain** : saisir `ooble.ca`.
3. Resend affiche des **enregistrements DNS** (SPF, DKIM, et souvent un CNAME de
   suivi + DMARC). Dans **GoDaddy → DNS → Manage Zones**, ajouter :
   - `TXT` SPF (ex. `v=spf1 include:amazonses.com ~all` fourni par Resend)
   - 3 `CNAME` DKIM (`resend._domainkey…` fournis par Resend)
   - `TXT` DMARC recommandé : `_dmarc` → `v=DMARC1; p=none;`
4. Revenir sur Resend → **Verify** (propagation DNS : quelques minutes à 1 h).
5. **Resend → API Keys** : créer une clé (droits d'envoi).
6. **Héberger les illustrations** : publier `emails/assets/*.png` à une URL publique
   (ex. `https://ooble.ca/email-assets/`). Ce sera la valeur de `EMAIL_ASSET_BASE`.
7. **Secrets de la fonction edge** (Supabase → Edge Functions → `send-email` → Secrets) :
   - `RESEND_API_KEY` = la clé créée
   - `EMAIL_FROM` = `Ooble <bonjour@ooble.ca>`
   - `EMAIL_ASSET_BASE` = `https://ooble.ca/email-assets`
8. **Déployer** la fonction :
   ```bash
   supabase functions deploy send-email --project-ref uukxacjjviiktmbikdwp
   ```

## Compatibilité illustrations

Les illustrations sont livrées en **PNG** (et non en SVG inline) car Gmail et Outlook
suppriment le SVG. Les PNG sont référencés par URL absolue (`{{assetBase}}/nom.png`),
il faut donc les héberger publiquement (étape 6). Pour la prévisualisation locale,
`build.mjs` utilise le chemin relatif `../assets`.
