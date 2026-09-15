// Système de design e-mail Ooble — HTML « bulletproof » (tables + styles inline).
// Palette et esprit repris de la landing (petrol / teal / encre / jaune).

export const C = {
  page: "#EEF2F2",
  card: "#ffffff",
  petrol: "#0F3A43",
  teal: "#2FA39B",
  tealDark: "#1c8378",
  ink: "#14201f",
  text: "#475467",
  muted: "#8a97a0",
  border: "#E4EAEA",
  soft: "#F5F8F8",
  yellow: "#F2C14E",
};

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Bouton « bulletproof » (table) — teal plein, coins arrondis. */
export function button(label, href) {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px auto 0;">
    <tr>
      <td align="center" bgcolor="${C.teal}" style="border-radius:12px;">
        <a href="${href}" target="_blank"
           style="display:inline-block;padding:14px 30px;font-family:${FONT};font-size:15px;font-weight:700;
                  color:#ffffff;text-decoration:none;border-radius:12px;border:1px solid ${C.tealDark};">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;
}

/** Carte d'informations : lignes label / valeur. `rows` = [[label, value, mono?]].
 *  Les valeurs `mono` (réf., adresses, e-mails) passent sous le label sur leur
 *  propre ligne pleine largeur — trop longues pour tenir à côté sur mobile. */
export function infoCard(rows, { title } = {}) {
  const head = title
    ? `<tr><td style="padding:4px 20px 12px;font-family:${FONT};font-size:11.5px;font-weight:700;
         letter-spacing:.08em;text-transform:uppercase;color:${C.muted};">${title}</td></tr>`
    : "";
  const monoStyle = `font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:13.5px;word-break:break-all;`;
  const body = rows
    .map(([label, value, mono], i) => {
      const pad = `padding:${i === 0 ? "14" : "13"}px 20px;border-top:${i === 0 ? "0" : `1px solid ${C.border}`};font-family:${FONT};`;
      if (mono) {
        return `
    <tr>
      <td style="${pad}">
        <p style="margin:0 0 5px;font-size:13.5px;color:${C.text};">${label}</p>
        <p style="margin:0;font-size:13.5px;font-weight:600;color:${C.ink};line-height:1.5;${monoStyle}">${value}</p>
      </td>
    </tr>`;
      }
      return `
    <tr>
      <td style="${pad}">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="font-size:14.5px;color:${C.text};">${label}</td>
          <td align="right" style="padding-left:12px;font-size:14.5px;font-weight:600;color:${C.ink};">${value}</td>
        </tr></table>
      </td>
    </tr>`;
    })
    .join("");
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background:${C.soft};border:1px solid ${C.border};border-radius:16px;margin:4px 0 8px;">
    ${head}${body}
  </table>`;
}

/** Encadré d'accent (ex. rappel de délai / sécurité). */
export function notice(text) {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background:#FFF9EC;border:1px solid #F3E2B8;border-radius:12px;margin:4px 0;">
    <tr><td style="padding:12px 16px;font-family:${FONT};font-size:12.5px;line-height:1.5;color:#7a5c15;">${text}</td></tr>
  </table>`;
}

/**
 * Enveloppe complète d'un e-mail.
 *  opts: illustration, alt, eyebrow, title, intro, contentHtml, cta{label,href},
 *        footerExtra, preheader, marketing (affiche le lien de désabonnement).
 */
export function layout(opts) {
  const {
    illustration, alt = "", eyebrow, title, intro = "", contentHtml = "",
    cta, footerExtra = "", preheader = "", marketing = false,
  } = opts;

  const heroImg = illustration
    ? `<img src="{{assetBase}}/${illustration}.png" width="220" alt="${alt}"
         style="display:block;margin:0 auto;width:220px;max-width:70%;height:auto;border:0;" />`
    : "";

  const eyebrowHtml = eyebrow
    ? `<p style="margin:0 0 6px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:.1em;
         text-transform:uppercase;color:${C.teal};">${eyebrow}</p>`
    : "";

  const introHtml = intro
    ? `<p style="margin:0 0 18px;font-family:${FONT};font-size:15px;line-height:1.6;color:${C.text};">${intro}</p>`
    : "";

  const ctaHtml = cta ? button(cta.label, cta.href) : "";

  const unsub = marketing
    ? `<p style="margin:14px 0 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.muted};">
         Vous recevez cet e-mail car vous êtes inscrit·e sur Ooble.
         <a href="{{unsubscribeUrl}}" style="color:${C.muted};text-decoration:underline;">Se désabonner</a>.
       </p>`
    : "";

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light only" />
<meta name="x-apple-disable-message-reformatting" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${C.page};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${C.page};">
    ${preheader}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};">
    <tr><td align="center" style="padding:28px 14px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;">

        <!-- En-tête / logo -->
        <tr><td style="padding:4px 6px 18px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="font-family:${FONT};font-size:22px;font-weight:800;letter-spacing:-.02em;color:${C.petrol};">
              ooble<span style="color:${C.teal};">.</span>
            </td>
          </tr></table>
        </td></tr>

        <!-- Carte principale -->
        <tr><td style="background:${C.card};border:1px solid ${C.border};border-radius:22px;padding:8px 30px 30px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td align="center" style="padding:16px 0 6px;">${heroImg}</td></tr>
            <tr><td style="padding:6px 0 0;">
              ${eyebrowHtml}
              <h1 style="margin:0 0 12px;font-family:${FONT};font-size:24px;line-height:1.25;font-weight:800;
                         letter-spacing:-.02em;color:${C.ink};">${title}</h1>
              ${introHtml}
              ${contentHtml}
              ${ctaHtml ? `<table role="presentation" width="100%"><tr><td align="center" style="padding:22px 0 6px;">${ctaHtml}</td></tr></table>` : ""}
            </td></tr>
          </table>
        </td></tr>

        <!-- Pied -->
        <tr><td style="padding:22px 12px 8px;">
          ${footerExtra}
          <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.muted};">
            Ooble — Achat &amp; vente d'USDT en dollars canadiens, payé par Interac e-Transfer.<br />
            Plateforme non-custodial : vos clés, vos USDT.
          </p>
          ${unsub}
          <p style="margin:12px 0 0;font-family:${FONT};font-size:12px;color:${C.muted};">© {{year}} Ooble Technologies</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
