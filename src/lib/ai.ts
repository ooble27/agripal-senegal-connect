/**
 * Client des agents IA Ooble.
 *
 * Appelle la fonction edge `ai-assist` avec un JWT staff, qui route vers
 * l'agent demandé (draft-mail, summarize-client, ...). Chaque appel est
 * journalisé côté serveur dans `ai_calls` — cette lib est un fin
 * wrapper typé au-dessus de `supabase.functions.invoke`.
 *
 * Contrat de retour : `{ ok: true, ...payload }` ou `{ error }` — jamais
 * d'exception. L'UI décide comment afficher l'erreur (bandeau feedback
 * dans le composer, toast dans la fiche client, etc.).
 */
import { supabase } from "@/integrations/supabase/client";
import type { ClientProfile, ClientOrder } from "@/lib/adminClient";

/** Contexte client transmis à Claude — sans PII inutile. */
export interface AIClientContext {
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

/** Résumé d'ordre transmis à Claude. */
export interface AIOrderSummary {
  side: "buy" | "sell";
  usdt: number;
  cad: number;
  status: string;
  createdAt: string;
}

export function toAIClientContext(p: ClientProfile): AIClientContext {
  return {
    fullName: p.fullName,
    email: p.email,
    accountType: p.accountType,
    kycStatus: p.kycStatus,
    totalCad: p.totalCad,
    orderCount: p.orderCount,
    createdAt: p.createdAt,
    businessName: p.businessName,
    phone: p.phone,
  };
}

export function toAIOrderSummaries(orders: ClientOrder[]): AIOrderSummary[] {
  return orders.map((o) => ({
    side: o.side,
    usdt: o.usdtAmount,
    cad: o.cadAmount,
    status: o.status,
    createdAt: o.createdAt,
  }));
}

interface AICallError { error: string }

async function invoke<T>(body: unknown): Promise<T | AICallError> {
  const { data, error } = await supabase.functions.invoke("ai-assist", { body });
  if (error) {
    // Extraire le message réel du body de la réponse (le SDK Supabase le
    // cache dans error.context.body).
    try {
      const ctx = (error as unknown as { context?: Response }).context;
      if (ctx?.text) {
        const raw = await ctx.text();
        try {
          const parsed = JSON.parse(raw) as { error?: string };
          return { error: parsed.error ?? raw };
        } catch { return { error: raw }; }
      }
    } catch { /* ignore */ }
    return { error: error.message };
  }
  if (data?.error) return { error: data.error };
  return data as T;
}

// ────────────────────────────────────────────────────────────
// Agent 1 — Assistant rédaction mail
// ────────────────────────────────────────────────────────────

export interface DraftMailInput {
  intention: string;
  client?: AIClientContext | null;
  previousMails?: string;
}

export interface DraftMailResult {
  ok: true;
  subject: string;
  body: string;
  tokens: { in: number; out: number };
}

export async function draftMail(input: DraftMailInput): Promise<DraftMailResult | AICallError> {
  return invoke<DraftMailResult>({ agent: "draft-mail", ...input });
}

// ────────────────────────────────────────────────────────────
// Agent 2 — Résumé de dossier client
// ────────────────────────────────────────────────────────────

export interface SummarizeClientInput {
  client: AIClientContext;
  orders: AIOrderSummary[];
  notes?: string[];
}

export interface SummarizeClientResult {
  ok: true;
  summary: string;
  tokens: { in: number; out: number };
}

export async function summarizeClient(input: SummarizeClientInput): Promise<SummarizeClientResult | AICallError> {
  return invoke<SummarizeClientResult>({ agent: "summarize-client", ...input });
}

// ────────────────────────────────────────────────────────────
// Agent 3 — Rédaction campagne marketing
// ────────────────────────────────────────────────────────────

export interface DraftCampaignInput {
  intention: string;
  segment?: string;
  design?: string;
}

export interface DraftCampaignResult {
  ok: true;
  subject: string;
  preheader: string;
  eyebrow: string;
  headline: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  tokens: { in: number; out: number };
}

export async function draftCampaign(input: DraftCampaignInput): Promise<DraftCampaignResult | AICallError> {
  return invoke<DraftCampaignResult>({ agent: "draft-campaign", ...input });
}

export function isAIError<T extends { ok?: true }>(res: T | AICallError): res is AICallError {
  return "error" in res;
}
