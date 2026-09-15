/**
 * Historique local des e-mails envoyés depuis le back-office.
 *
 * V1 sur `localStorage` : suffit pour retracer les envois d'un poste ; sera
 * migré vers Supabase (`mail_messages` table + RLS staff-only) en V2. L'API
 * publique ne change pas quand on bascule sur la table.
 */
import type { EmailTemplate } from "@/lib/email";

const KEY = "ooble.admin.mail.sent";

export interface SentMail {
  id: string;
  to: string;
  subject: string;
  template: EmailTemplate;
  vars: Record<string, string>;
  sentAt: string;
  sentBy: string;
  /** Retour du serveur : id Resend si succès, message d'erreur sinon. */
  outcome: { ok: true; providerId?: string } | { ok: false; error: string };
}

export function loadSent(): SentMail[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as SentMail[];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export function saveSent(list: SentMail[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 200))); }
  catch { /* incognito / quota */ }
}

export function recordSent(mail: SentMail): SentMail[] {
  const next = [mail, ...loadSent()];
  saveSent(next);
  return next;
}
