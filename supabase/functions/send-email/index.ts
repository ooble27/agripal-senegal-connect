// Fonction edge Ooble — envoi d'e-mails via Resend.
//
// Trois modes :
//
//   ─── Mode « custom » (staff écrit librement) ────────────────
//   POST JSON :
//     { "to": "…", "subject": "…", "html": "<p>…</p>",
//       "text": "(optionnel, sinon dérivé du HTML)",
//       "replyTo": "(optionnel)",
//       "cc": ["…"], "bcc": ["…"] }
//
//   Le corps `html` est encapsulé dans le layout Ooble (header + footer
//   monochromes) pour rester cohérent avec la marque.
//
//   ─── Mode « template » (transactionnel) ─────────────────────
//   POST JSON :
//     { "to": "…", "template": "welcome" | "order-buy" | …,
//       "vars": { … }, "subject": "(optionnel)" }
//
//   ─── Mode « staffNotify » (notification interne) ────────────
//   POST JSON :
//     { "staffNotify": "new-order",
//       "order": { ref, side, cadAmount, usdtAmount, network, address,
//                  clientEmail, clientName, adminUrl } }
//
//   Le destinataire est lu côté serveur (STAFF_NOTIFICATION_EMAIL) —
//   jamais fourni par le client — pour qu'aucun appel navigateur ne
//   puisse rediriger la notification ailleurs.
//
// Secrets requis (Supabase → Edge Functions → Secrets) :
//   RESEND_API_KEY              clé API Resend
//   EMAIL_FROM                  ex. "Ooble <bonjour@ooble.ca>" (domaine vérifié)
//   STAFF_NOTIFICATION_EMAIL    destinataire des notifs internes (nouvelles commandes)
//   EMAIL_ASSET_BASE            ex. "https://ooble.ca/email-assets"

import { TEMPLATES, SUBJECTS } from "./templates.ts";
import {
  wrapCustomBody, htmlToText,
  eyebrow, heading, lead, dataRows, primaryButton,
} from "./layout.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Remplace {{clé}} par la valeur ; laisse les clés inconnues intactes. */
function render(str: string, data: Record<string, string>): string {
  return str.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in data ? data[k] : m));
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

interface StaffOrderPayload {
  ref: string;
  side: "buy" | "sell";
  cadAmount: string;
  usdtAmount: string;
  network: string;
  address: string;
  clientEmail: string;
  clientName: string;
  adminUrl: string;
}

interface Payload {
  to?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  subject?: string;
  // Mode template
  template?: string;
  vars?: Record<string, string>;
  // Mode custom
  html?: string;
  text?: string;
  // Mode staffNotify
  staffNotify?: "new-order";
  order?: StaffOrderPayload;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM") ?? "Ooble <onboarding@resend.dev>";
  const assetBase = Deno.env.get("EMAIL_ASSET_BASE") ?? "https://ooble.ca/email-assets";
  if (!apiKey) return json({ error: "RESEND_API_KEY manquant." }, 500);

  let payload: Payload;
  try { payload = await req.json(); }
  catch { return json({ error: "JSON invalide." }, 400); }

  const {
    to: rawTo, cc, bcc, replyTo, subject, template, vars = {}, html, text,
    staffNotify, order,
  } = payload;

  let finalHtml: string;
  let finalText: string | undefined;
  let finalSubject: string;
  let to = rawTo;

  if (staffNotify === "new-order") {
    // ─── Mode staffNotify — destinataire déterminé côté serveur ─
    const staffTo = Deno.env.get("STAFF_NOTIFICATION_EMAIL")?.trim();
    if (!staffTo) {
      return json({
        error: "STAFF_NOTIFICATION_EMAIL manquant : configurer le secret dans Supabase pour recevoir les notifications de nouvelles commandes.",
      }, 500);
    }
    if (!order?.ref) return json({ error: "Champ 'order' requis (avec ref, side, montants…)." }, 400);
    to = staffTo;
    const built = buildStaffNewOrder(order, assetBase);
    finalHtml = built.html;
    finalText = built.text;
    finalSubject = built.subject;
  } else if (!rawTo) {
    return json({ error: "Champ 'to' requis." }, 400);
  } else if (template) {
    // ─── Mode template ────────────────────────────────────
    if (!(template in TEMPLATES)) {
      return json({ error: `Template inconnu : ${template}` }, 400);
    }
    const data: Record<string, string> = {
      assetBase,
      year: String(new Date().getFullYear()),
      unsubscribeUrl: vars.unsubscribeUrl ?? "#",
      ...vars,
    };
    finalHtml = render(TEMPLATES[template], data);
    finalSubject = render(subject ?? SUBJECTS[template] ?? "Ooble", data);
    finalText = text; // laissé optionnel pour les templates
  } else if (html) {
    // ─── Mode custom (staff a écrit le contenu) ───────────
    if (!subject?.trim()) return json({ error: "Champ 'subject' requis en mode custom." }, 400);
    finalHtml = wrapCustomBody({ bodyHtml: html, assetBase });
    finalSubject = subject.trim();
    finalText = text ?? htmlToText(html);
  } else {
    return json({ error: "Fournir soit 'template', soit 'html'." }, 400);
  }

  const body: Record<string, unknown> = {
    from,
    to,
    subject: finalSubject,
    html: finalHtml,
  };
  if (finalText) body.text = finalText;
  if (cc?.length) body.cc = cc;
  if (bcc?.length) body.bcc = bcc;
  if (replyTo) body.reply_to = replyTo;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const result = await res.json().catch(() => ({} as Record<string, unknown>));
  if (!res.ok) {
    // Resend renvoie { message, name, statusCode } → on aplatit pour que le
    // front puisse afficher un message actionnable (« domain not verified »,
    // « invalid API key », etc.) plutôt qu'un opaque « non-2xx status code ».
    const r = result as { message?: string; name?: string };
    const detail = r.message || r.name || `HTTP ${res.status}`;
    return json({ error: `Resend : ${detail}` }, res.status);
  }
  return json({ ok: true, id: result.id });
});

// ────────────────────────────────────────────────────────────
// Notification interne : nouvelle commande
//
// Rendu très scannable : sujet préfixé par le type d'ordre et la référence,
// eyebrow + heading qui disent immédiatement ce que c'est, tableau
// détaillé, bouton pour ouvrir la commande dans le back-office. Le mot
// « MANUEL » n'apparaît nulle part : la file d'attente est déjà branchée,
// ce mail est un rappel poussé (« au cas où »).
// ────────────────────────────────────────────────────────────

function buildStaffNewOrder(order: StaffOrderPayload, assetBase: string) {
  const isBuy = order.side === "buy";
  const sideLabel = isBuy ? "Ordre d'achat" : "Ordre de vente";
  const clientDisplay = order.clientName?.trim()
    ? `${order.clientName.trim()} · ${order.clientEmail}`
    : order.clientEmail;
  const headline = isBuy
    ? `Achat ${order.usdtAmount} USDT pour ${order.cadAmount} CAD`
    : `Vente ${order.usdtAmount} USDT pour ${order.cadAmount} CAD`;
  const addressLabel = isBuy ? "Adresse de réception client" : "Adresse de dépôt (Ooble)";

  const bodyHtml =
    eyebrow(`Nouvelle commande · ${sideLabel}`) +
    heading(headline) +
    lead(
      isBuy
        ? "Un client vient de placer un ordre d'achat. Vous devez confirmer la réception de l'Interac puis envoyer les USDT à l'adresse indiquée."
        : "Un client vient de placer un ordre de vente. Vous devez confirmer la réception des USDT sur l'adresse de dépôt puis envoyer l'Interac.",
    ) +
    dataRows([
      ["Client",     clientDisplay],
      ["Référence",  order.ref,            true],
      ["Montant CAD", `${order.cadAmount} CAD`],
      ["Montant USDT", `${order.usdtAmount} USDT`],
      ["Réseau",     order.network],
      [addressLabel, order.address,        true],
    ]) +
    primaryButton(order.adminUrl, "Ouvrir dans le back-office");

  return {
    html: wrapCustomBody({ bodyHtml, assetBase }),
    text: `${sideLabel} ${order.ref}\n\n${headline}\nClient : ${clientDisplay}\nRéseau : ${order.network}\n${addressLabel} : ${order.address}\n\nOuvrir : ${order.adminUrl}`,
    subject: `Nouvelle commande ${isBuy ? "d'achat" : "de vente"} ${order.ref}`,
  };
}
