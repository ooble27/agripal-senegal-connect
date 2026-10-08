// Avis de virement Interac reçus sur interac@ooble.ca (dépôt automatique).
//
// Chaque avis est enregistré dans `interac_receipts`. Un avis dont la
// signature DKIM d'Interac n'est pas valide ne touche à aucun ordre. Un avis
// authentique est rapproché d'un ordre d'achat si les trois conditions sont
// réunies :
//   • la référence OOB-XXXXXXXX de l'ordre figure dans le message ;
//   • le montant reçu est exactement celui de l'ordre ;
//   • le nom de l'expéditeur correspond au client (ou à son entreprise).
// L'ordre passe alors à « paiement reçu », le client est prévenu, et l'envoi
// automatique des USDT est demandé à `usdt-payout` si les réglages le
// permettent. Dans tous les autres cas, rien ne bouge : l'avis attend
// l'équipe dans l'admin.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const isInteracSender = (email: string) => /@(?:[a-z0-9-]+\.)*interac\.ca$/i.test(email);

const stripHtml = (h: string) =>
  h.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|tr|td|li|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#36;/g, "$").replace(/&#39;|&rsquo;/g, "'")
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();

/** « 1 234,56 $ » ou « $1,234.56 » → 1234.56 */
function parseAmount(text: string): number | null {
  const near = /(?:sent you|vous a envoy[ée]|has sent|envoy[ée] un virement|deposited|déposé)[\s\S]{0,80}?(\$\s?[\d,]+\.\d{2}|[\d\s  .]+,\d{2}\s?\$)/i.exec(text);
  const any = near?.[1] ?? /(\$\s?[\d,]+\.\d{2})|([\d\s  .]+,\d{2}\s?\$)/.exec(text)?.[0];
  if (!any) return null;
  const s = any.replace(/[$\s  ]/g, "");
  const n = s.includes(",") && !/\.\d{2}$/.test(s) ? Number(s.replace(/\./g, "").replace(",", ".")) : Number(s.replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

function parseSender(subject: string, text: string): string {
  const re = /(?:INTERAC[^:]*:\s*)?([^:\n]{2,80}?)\s+(?:sent you|has sent you|vous a envoy[ée]|vous a fait parvenir)/i;
  return (re.exec(subject)?.[1] ?? re.exec(text)?.[1] ?? "").replace(/^(?:Virement|INTERAC)[^:]*:\s*/i, "").trim();
}

// Mots sans valeur pour comparer des noms : formes juridiques, articles,
// civilités et liaisons des comptes conjoints (« X ET Y », « X AND Y »).
const STOP = new Set([
  "INC", "LTD", "LTEE", "CORP", "CO", "SENC", "SEC", "ENR", "THE", "LA", "LE", "LES", "DE", "DU", "DES",
  "AND", "ET", "OR", "OU", "MR", "MRS", "MS", "MME", "MLLE", "DR",
]);
const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, " ")
    .split(" ").filter((w) => w.length >= 2 && !STOP.has(w));

/**
 * Correspondance approximative : casse, accents, ordre des mots, traits
 * d'union, civilités et comptes conjoints sont ignorés. Les noms
 * correspondent si au moins deux mots se recoupent (ou tous, quand l'un des
 * deux noms n'a qu'un mot).
 */
export function namesMatch(a: string, b: string): boolean {
  const A = new Set(norm(a)), B = new Set(norm(b));
  if (!A.size || !B.size) return false;
  const common = [...A].filter((w) => B.has(w)).length;
  return common >= Math.min(2, A.size, B.size);
}

export interface InteracMail {
  /** Message-ID du courriel (dédoublonnage). */
  messageId: string | null;
  fromEmail: string;
  subject: string;
  text: string;
  html: string;
  /** Signature DKIM d'interac.ca valide, alignée sur l'expéditeur, sans l=. */
  authenticated: boolean;
  authDetail: string;
}

export async function handleInterac(db: SupabaseClient, m: InteracMail, supabaseUrl: string, serviceKey: string) {
  const text = m.text || stripHtml(m.html);
  const amount = parseAmount(text);
  const sender = parseSender(m.subject, text);
  const refs = [...new Set([...`${m.subject}\n${text}`.matchAll(/OOB[\s-]?([0-9A-F]{8})\b/gi)].map((x) => x[1].toLowerCase()))];
  const interacRef = /(?:R[ée]f[ée]rence(?: Number| number)?|Num[ée]ro de r[ée]f[ée]rence|N[o°º]\s*de r[ée]f[ée]rence)\s*:?\s*(?!OOB)([A-Za-z0-9]{6,})/i.exec(text)?.[1] ?? null;
  const auth = m.authenticated;
  console.log("interac: montant", amount, "réf.", refs, "dkim", m.authDetail);

  const base = {
    resend_id: m.messageId, interac_ref: interacRef, from_email: m.fromEmail, sender_name: sender || null,
    amount_cad: amount, order_ref: refs[0] ? `OOB-${refs[0].toUpperCase()}` : null, authenticated: auth,
    subject: m.subject, body_text: text.slice(0, 8000),
  };
  const save = async (status: string, reason: string, orderId: string | null = null) => {
    const { error } = await db.from("interac_receipts").insert({ ...base, status, reason, order_id: orderId });
    if (error?.code === "23505") return "duplicate";
    if (error) console.error("interac: enregistrement", error);
    return status;
  };

  if (!auth || !isInteracSender(m.fromEmail)) {
    return { status: await save("mismatch", `Avis non authentifié (${m.authDetail}). Aucun ordre modifié : vérifiez le dépôt dans le compte bancaire.`) };
  }
  if (!/automatically deposited|d[ée]pos[ée]e? automatiquement|d[ée]p[ôo]t automatique|has been deposited|a [ée]t[ée] d[ée]pos[ée]/i.test(text)) {
    return { status: await save("ignored", "Avis sans dépôt automatique (virement à accepter ou autre message Interac).") };
  }
  if (!amount) return { status: await save("unmatched", "Montant introuvable dans l'avis.") };
  if (refs.length === 0) return { status: await save("unmatched", "Aucune référence OOB- dans le message du virement.") };
  if (refs.length > 1) return { status: await save("mismatch", "Plusieurs références dans le message.") };

  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const { data: cands } = await db.from("orders").select("id, user_id, side, status, cad_amount, usdt_amount")
    .eq("side", "buy").gt("created_at", since);
  const order = (cands ?? []).find((o) => o.id.startsWith(refs[0]));
  if (!order) return { status: await save("unmatched", `Aucun achat récent ${base.order_ref}.`) };
  if (!["created", "awaiting_payment"].includes(order.status)) {
    return { status: await save("mismatch", `L'ordre est déjà « ${order.status} ».`, order.id) };
  }
  if (Math.abs(Number(order.cad_amount) - amount) > 0.004) {
    return { status: await save("mismatch", `Montant reçu ${amount} $ ≠ montant de l'ordre ${order.cad_amount} $.`, order.id) };
  }
  const { data: prof } = await db.from("profiles").select("email, full_name, business_name, account_type").eq("id", order.user_id).maybeSingle();
  const okName = !!sender && (namesMatch(sender, prof?.full_name ?? "") || namesMatch(sender, prof?.business_name ?? ""));
  if (!okName) {
    return { status: await save("mismatch", `Expéditeur « ${sender || "?"} » différent du client « ${prof?.business_name || prof?.full_name || "?"} » (paiement d'un tiers ?).`, order.id) };
  }

  // Rapproché : l'avis est enregistré d'abord (un avis = un seul rapprochement).
  const st = await save("matched", "Rapproché : avis authentifié, référence, montant et nom concordent.", order.id);
  if (st === "duplicate") return { status: st };

  const { data: moved } = await db.from("orders").update({ status: "payment_received" })
    .eq("id", order.id).in("status", ["created", "awaiting_payment"]).select("id").maybeSingle();
  if (!moved) return { status: "mismatch" };
  await db.from("order_events").insert({
    order_id: order.id, previous_status: order.status, new_status: "payment_received", actor: "system",
    note: `Virement Interac reçu de ${sender} (${amount} $)${interacRef ? `, réf. ${interacRef}` : ""}`,
  });
  await db.from("payment_confirmations").insert({
    order_id: order.id, direction: "inbound", method: "interac_etransfer", reference: interacRef, amount_cad: amount, confirmed_by: "interac-email",
  });

  const ref = `OOB-${order.id.slice(0, 8).toUpperCase()}`;
  const call = (fn: string, body: unknown) => fetch(`${supabaseUrl}/functions/v1/${fn}`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` }, body: JSON.stringify(body),
  });
  if (prof?.email) {
    await call("send-email", {
      to: prof.email, template: "payment-received",
      vars: { ref, amount: `${amount.toFixed(2).replace(".", ",")} $ CAD`, usdtAmount: String(order.usdt_amount), orderUrl: `https://ooble.ca/app/activite/${order.id}` },
    }).catch((e) => console.error("interac: courriel", e));
  }

  // Envoi automatique des USDT si les réglages le permettent ; usdt-payout
  // refait tous les contrôles (seuil, client vérifié, avis, soldes, plafond).
  // Sinon l'ordre reste « paiement reçu » et l'équipe clique « Envoyer ».
  const { data: s } = await db.from("settlement_settings").select("auto_payout, auto_payout_max_cad").eq("id", 1).maybeSingle();
  const auto = !!s?.auto_payout && amount <= Number(s.auto_payout_max_cad);
  if (auto) {
    const job = call("usdt-payout", { action: "send", order_id: order.id })
      .then((r) => r.json()).then((r) => console.log("interac: envoi automatique", JSON.stringify(r)))
      .catch((e) => console.error("interac: envoi automatique", e));
    // @ts-ignore EdgeRuntime existe dans l'environnement Supabase
    if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(job); else await job;
  }
  return { status: "matched", orderId: order.id, autoPayout: auto };
}
