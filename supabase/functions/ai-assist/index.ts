// Fonction edge Ooble — agents IA (Claude / Anthropic).
//
// Une seule fonction héberge tous les agents pour simplifier le déploiement.
// Chaque agent = un handler avec un « system prompt » et une transformation
// entrée→sortie spécifique. Chaque appel est journalisé dans `ai_calls`
// (audit + coût). Auth : le staff appelle en tant qu'utilisateur connecté
// (JWT du browser), l'edge function vérifie is_staff() via un lookup sur
// la table user_roles.
//
// Agents implémentés (dans ce commit) :
//   - draft-mail        : rédige un mail à partir d'une intention staff
//   - summarize-client  : résume un dossier client 360° en 3-5 puces
//
// Agents à venir dans les prochains commits :
//   - kyc-analyze
//   - detect-anomalies
//   - classify-mail
//
// Secrets requis :
//   ANTHROPIC_API_KEY       clé Anthropic Messages API
//   SUPABASE_URL            (auto Supabase)
//   SUPABASE_SERVICE_ROLE_KEY (auto Supabase)

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ANTHROPIC_MODEL = "claude-opus-4-7";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function preview(text: string, len = 200): string {
  return text.length <= len ? text : `${text.slice(0, len)}…`;
}

// ────────────────────────────────────────────────────────────
// Appel à Claude Messages API (une seule primitive pour tous les agents).
// Renvoie le contenu texte + les compteurs de tokens.
// ────────────────────────────────────────────────────────────

interface ClaudeCallResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

async function callClaude(
  apiKey: string,
  system: string,
  userMessage: string,
  maxTokens = 1024,
): Promise<ClaudeCallResult> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API ${res.status}: ${err.slice(0, 500)}`);
  }

  const data = await res.json();
  const text = (data.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("\n")
    .trim();
  return {
    text,
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
  };
}

// ────────────────────────────────────────────────────────────
// Handlers d'agents
// ────────────────────────────────────────────────────────────

/**
 * Agent 1 — Assistant rédaction mail.
 *
 * Entrée : intention en langage naturel + contexte client (nom, KYC, volume,
 * dernières commandes). Sortie : draft de mail complet en français,
 * markdown, ton Ooble, prêt à charger dans le composer.
 */
const SYSTEM_DRAFT_MAIL = `Tu es l'assistant de rédaction mail de Ooble, une plateforme canadienne d'échange USDT/CAD non-custodial réglementée par CANAFE.

Tu produis des mails en français québécois professionnel — jamais familier, jamais corporate creux. Ton : direct, précis, chaleureux mais sans effusion. On dit « vous », pas « tu ».

Contraintes strictes :
- Structure : salutation « Bonjour {{prenom}}, » — ne remplace PAS {{prenom}}, garde le placeholder — puis 2-4 paragraphes courts, puis une signature en 2 lignes (« Cordialement, » suivi de la marque au moment de l'insertion).
- Utilise du markdown simple : **gras** pour souligner un élément critique (référence, montant), * ou - pour les listes.
- Pour les appels à l'action, écris le lien seul sur sa ligne : \`[Reprendre la vérification](https://ooble.ca/app/verification)\`. Le composer le rendra en bouton.
- N'invente PAS de faits (montants, dates, adresses, référence d'ordre). Utilise des placeholders {{ref}}, {{montant}}, {{date}} etc. si l'info manque.
- Vocabulaire Ooble : « USDT », « Interac e-Transfer », « CANAFE », « KYC », « ordre » (pas « transaction »), « réseau » (pas « blockchain » quand on parle à un client).
- Longueur : 80-180 mots. Un mail court est plus lu.
- Ne signe PAS le mail — la signature est ajoutée par le composer.

Ne produis QUE le corps du mail (sujet + corps), sans commentaire méta.

Format de sortie EXACT :
SUBJECT: <sujet du mail>

<corps du mail en markdown>`;

async function draftMail(
  apiKey: string,
  input: { intention: string; client?: ClientContext | null; previousMails?: string },
): Promise<{ subject: string; body: string; call: ClaudeCallResult }> {
  const parts: string[] = [];
  parts.push(`Intention du staff : ${input.intention}`);
  if (input.client) {
    parts.push("\nContexte client :");
    parts.push(clientContextToText(input.client));
  }
  if (input.previousMails) {
    parts.push("\nDerniers échanges avec ce client (résumé) :");
    parts.push(input.previousMails);
  }
  parts.push("\nProduit maintenant le mail au format demandé.");

  const call = await callClaude(apiKey, SYSTEM_DRAFT_MAIL, parts.join("\n"), 800);

  // Parse "SUBJECT: ...\n\n<body>"
  const subjMatch = /^SUBJECT:\s*(.+?)\n/i.exec(call.text);
  const subject = subjMatch ? subjMatch[1].trim() : "Message de Ooble";
  const body = subjMatch ? call.text.slice(subjMatch[0].length).trim() : call.text;
  return { subject, body, call };
}

/**
 * Agent 2 — Résumé de dossier client 360°.
 *
 * Entrée : profil + ordres + notes. Sortie : 4-6 puces markdown ultra-denses
 * qui donnent le contexte utile en 20 secondes de lecture.
 */
const SYSTEM_SUMMARIZE_CLIENT = `Tu es l'assistant compliance de Ooble. Tu produis des résumés de dossier client destinés à un agent qui reprend le dossier ou prépare un contact.

Contraintes :
- Format : 4 à 6 puces markdown, chacune une phrase courte.
- Contenu : (1) profil sommaire (nom, type, ancienneté), (2) volume et fréquence, (3) statut KYC, (4) points d'attention (KYC en attente, ordres bloqués, notes staff notables), (5) dernière activité, (6) recommandation si un signal évident.
- Chiffres : arrondis lisibles (« 12 450 $ CAD » pas « 12 456,78 »).
- Ton : neutre professionnel, factuel. Pas de conjecture. Pas de « il semble que ».
- Français.
- Longueur totale : 80-150 mots max.

Ne produis QUE les puces. Aucune intro, aucune conclusion.`;

async function summarizeClient(
  apiKey: string,
  input: { client: ClientContext; orders: OrderSummary[]; notes?: string[] },
): Promise<{ summary: string; call: ClaudeCallResult }> {
  const parts: string[] = [];
  parts.push("Profil client :");
  parts.push(clientContextToText(input.client));
  parts.push(`\nHistorique des ordres (${input.orders.length}) :`);
  if (input.orders.length === 0) {
    parts.push("Aucun ordre.");
  } else {
    for (const o of input.orders.slice(0, 30)) {
      parts.push(`- ${o.side === "buy" ? "Achat" : "Vente"} ${o.usdt} USDT / ${o.cad} CAD · ${o.status} · ${o.createdAt.slice(0, 10)}`);
    }
    if (input.orders.length > 30) parts.push(`... et ${input.orders.length - 30} autres.`);
  }
  if (input.notes && input.notes.length > 0) {
    parts.push("\nNotes internes staff :");
    for (const n of input.notes.slice(0, 20)) parts.push(`- ${n}`);
  }
  parts.push("\nProduis le résumé maintenant.");

  const call = await callClaude(apiKey, SYSTEM_SUMMARIZE_CLIENT, parts.join("\n"), 500);
  return { summary: call.text, call };
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

interface ClientContext {
  fullName: string;
  email: string;
  accountType: string;
  kycStatus: string;
  totalCad: number;
  orderCount: number;
  createdAt: string;
  businessName?: string | null;
  phone?: string | null;
}

interface OrderSummary {
  side: "buy" | "sell";
  usdt: number;
  cad: number;
  status: string;
  createdAt: string;
}

function clientContextToText(c: ClientContext): string {
  const nfCad = new Intl.NumberFormat("fr-CA", { maximumFractionDigits: 0 });
  const nfOrders = new Intl.NumberFormat("fr-CA", { maximumFractionDigits: 0 });
  const kycFr: Record<string, string> = {
    approved: "Approuvé",
    pending: "En attente de vérification",
    rejected: "Refusé",
    not_started: "Non commencé",
  };
  const lines = [
    `- Nom : ${c.fullName}`,
    `- E-mail : ${c.email}`,
    `- Type : ${c.accountType === "business" ? `Entreprise${c.businessName ? ` (${c.businessName})` : ""}` : "Individuel"}`,
    `- KYC : ${kycFr[c.kycStatus] ?? c.kycStatus}`,
    `- Volume cumulé : ${nfCad.format(c.totalCad)} $ CAD`,
    `- Commandes : ${nfOrders.format(c.orderCount)}`,
    `- Client depuis : ${c.createdAt.slice(0, 10)}`,
  ];
  if (c.phone) lines.push(`- Téléphone : ${c.phone}`);
  return lines.join("\n");
}

/**
 * Vérifie que l'utilisateur appartient au staff. Requête directe sur
 * `user_roles` avec le service_role (RLS contournée) : suffit qu'une
 * ligne existe. Même définition que la fonction SQL `is_staff()` mais
 * sans passer par un RPC dont la sérialisation peut varier.
 */
async function isStaff(client: SupabaseClient, userId: string): Promise<boolean> {
  const { count, error } = await client
    .from("user_roles")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) return false;
  return (count ?? 0) > 0;
}

async function logCall(
  admin: SupabaseClient,
  args: {
    agent: string;
    staffId: string | null;
    inputPreview: string;
    call?: ClaudeCallResult;
    error?: string;
    startedAt: number;
  },
): Promise<void> {
  const durationMs = Date.now() - args.startedAt;
  await admin.from("ai_calls").insert({
    agent: args.agent,
    staff_id: args.staffId,
    input_preview: args.inputPreview,
    output_preview: args.call?.text ? preview(args.call.text) : null,
    model: ANTHROPIC_MODEL,
    input_tokens: args.call?.inputTokens ?? null,
    output_tokens: args.call?.outputTokens ?? null,
    duration_ms: durationMs,
    status: args.error ? "error" : "ok",
    error: args.error ?? null,
  });
}

// ────────────────────────────────────────────────────────────
// Router
// ────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────
// Agent 3 — Rédaction campagne marketing
// ────────────────────────────────────────────────────────────

const SYSTEM_DRAFT_CAMPAIGN = `Tu es le rédacteur marketing de Ooble, une plateforme canadienne d'échange USDT/CAD non-custodial réglementée par CANAFE.

Tu produis du contenu d'e-mail marketing en français québécois professionnel. Ton : confiant, clair, engageant mais pas agressif. On vouvoie le client.

Contexte Ooble :
- Ooble permet d'acheter et vendre des USDT (stablecoin) en dollars canadiens via Interac e-Transfer.
- Plateforme non-custodial : les USDT sont envoyés directement au portefeuille du client.
- Réseaux supportés : Tron (TRC20), Ethereum (ERC20), Polygon, Solana, BNB Smart Chain (BEP20), Avalanche.
- KYC obligatoire (vérification d'identité) avant la première transaction.
- Vocabulaire : « USDT », « Interac e-Transfer », « ordre » (pas « transaction »), « réseau » (pas « blockchain » pour un client).

Contraintes :
- Le corps (body) est en markdown simple : **gras**, *italique*, listes (- ), liens [texte](url).
- Utilise {{prenom}} pour personnaliser avec le prénom du client. Ne remplace PAS ce placeholder.
- Ne mets PAS de salutation (pas de « Bonjour {{prenom}} ») car le design de l'email a son propre header.
- Le corps doit faire 60-150 mots. Court et percutant.
- N'invente pas de chiffres précis (taux, prix) sauf si le staff les a donnés.
- Le CTA (bouton) doit pointer vers une URL crédible d'Ooble (https://ooble.ca/app/acheter, https://ooble.ca/app, etc.).
- Ne signe PAS le mail.

Format de sortie EXACT (JSON) :
{"subject":"...","preheader":"...","eyebrow":"...","headline":"...","body":"...","ctaLabel":"...","ctaUrl":"..."}

Règles pour chaque champ :
- subject : 40-60 caractères, accrocheur, pas de majuscules abusives
- preheader : 50-90 caractères, complète le sujet dans la boîte de réception
- eyebrow : 1-3 mots en majuscules (ex: NOUVEAU, OFFRE SPÉCIALE, MISE À JOUR)
- headline : 5-10 mots, le message clé, percutant
- body : contenu principal en markdown, 60-150 mots
- ctaLabel : 2-4 mots pour le bouton (ex: Acheter maintenant, En savoir plus)
- ctaUrl : URL Ooble pertinente

Ne produis QUE le JSON, sans commentaire, sans bloc code.`;

async function draftCampaign(
  apiKey: string,
  input: { intention: string; segment?: string; design?: string },
): Promise<{
  subject: string;
  preheader: string;
  eyebrow: string;
  headline: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  call: ClaudeCallResult;
}> {
  const parts: string[] = [];
  parts.push(`Intention de la campagne : ${input.intention}`);
  if (input.segment) parts.push(`Segment ciblé : ${input.segment}`);
  if (input.design) parts.push(`Design choisi : ${input.design}`);
  parts.push("\nProduit le JSON maintenant.");

  const call = await callClaude(apiKey, SYSTEM_DRAFT_CAMPAIGN, parts.join("\n"), 600);

  let parsed: Record<string, string>;
  try {
    const cleaned = call.text.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = {
      subject: "Nouvelle campagne Ooble",
      preheader: "",
      eyebrow: "NOUVEAU",
      headline: "Découvrez notre dernière nouveauté",
      body: call.text,
      ctaLabel: "En savoir plus",
      ctaUrl: "https://ooble.ca/app",
    };
  }

  return {
    subject: parsed.subject ?? "Nouvelle campagne Ooble",
    preheader: parsed.preheader ?? "",
    eyebrow: parsed.eyebrow ?? "NOUVEAU",
    headline: parsed.headline ?? "",
    body: parsed.body ?? "",
    ctaLabel: parsed.ctaLabel ?? "",
    ctaUrl: parsed.ctaUrl ?? "",
    call,
  };
}

interface Payload {
  agent: "draft-mail" | "summarize-client" | "draft-campaign";
  // draft-mail / draft-campaign
  intention?: string;
  client?: ClientContext | null;
  previousMails?: string;
  // draft-campaign
  segment?: string;
  design?: string;
  // summarize-client
  orders?: OrderSummary[];
  notes?: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!anthropicKey) return json({ error: "ANTHROPIC_API_KEY manquant." }, 500);
  if (!supabaseUrl || !serviceKey) return json({ error: "Configuration Supabase manquante." }, 500);

  // Auth : lire le JWT du client pour identifier le staff.
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  if (!jwt) return json({ error: "Authentification requise." }, 401);

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData.user) return json({ error: "Session invalide." }, 401);
  const userId = userData.user.id;

  if (!(await isStaff(admin, userId))) {
    return json({
      error: `Accès réservé au staff. Aucun rôle trouvé pour ${userData.user.email ?? userId}. Ajouter une ligne dans user_roles.`,
    }, 403);
  }

  let payload: Payload;
  try { payload = await req.json(); }
  catch { return json({ error: "JSON invalide." }, 400); }

  const startedAt = Date.now();
  try {
    if (payload.agent === "draft-mail") {
      const intention = payload.intention?.trim();
      if (!intention) return json({ error: "Champ 'intention' requis." }, 400);
      const inputPreview = preview(intention);
      const { subject, body, call } = await draftMail(anthropicKey, {
        intention,
        client: payload.client ?? null,
        previousMails: payload.previousMails,
      });
      await logCall(admin, { agent: "draft-mail", staffId: userId, inputPreview, call, startedAt });
      return json({ ok: true, subject, body, tokens: { in: call.inputTokens, out: call.outputTokens } });
    }

    if (payload.agent === "draft-campaign") {
      const intention = payload.intention?.trim();
      if (!intention) return json({ error: "Champ 'intention' requis." }, 400);
      const inputPreview = preview(intention);
      const result = await draftCampaign(anthropicKey, {
        intention,
        segment: payload.segment,
        design: payload.design,
      });
      await logCall(admin, { agent: "draft-campaign", staffId: userId, inputPreview, call: result.call, startedAt });
      return json({
        ok: true,
        subject: result.subject,
        preheader: result.preheader,
        eyebrow: result.eyebrow,
        headline: result.headline,
        body: result.body,
        ctaLabel: result.ctaLabel,
        ctaUrl: result.ctaUrl,
        tokens: { in: result.call.inputTokens, out: result.call.outputTokens },
      });
    }

    if (payload.agent === "summarize-client") {
      if (!payload.client) return json({ error: "Champ 'client' requis." }, 400);
      const inputPreview = preview(`Résumé de ${payload.client.fullName ?? payload.client.email}`);
      const { summary, call } = await summarizeClient(anthropicKey, {
        client: payload.client,
        orders: payload.orders ?? [],
        notes: payload.notes,
      });
      await logCall(admin, { agent: "summarize-client", staffId: userId, inputPreview, call, startedAt });
      return json({ ok: true, summary, tokens: { in: call.inputTokens, out: call.outputTokens } });
    }

    return json({ error: `Agent inconnu : ${payload.agent}` }, 400);
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    await logCall(admin, {
      agent: payload.agent ?? "unknown",
      staffId: userId,
      inputPreview: preview(JSON.stringify(payload).slice(0, 200)),
      error: errMsg,
      startedAt,
    });
    return json({ error: errMsg }, 500);
  }
});
