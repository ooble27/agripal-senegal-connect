/**
 * Vérification des entreprises (KYB) — côté back-office.
 * Lecture : tout le staff. Décision : admin et kyc_reviewer (RLS).
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { BusinessOwner, KybDocKey } from "@/lib/kyb";
import { logAdminAction } from "@/lib/audit";
import { sendCustomEmail } from "@/lib/email";

type DbStatus = Database["public"]["Enums"]["kyc_status"];
type Row = Database["public"]["Tables"]["business_verifications"]["Row"];
type RowWithProfile = Row & { profiles: { full_name: string | null; email: string | null; kyc_status: DbStatus } | null };

export interface KybRequest {
  id: string;
  userId: string;
  status: DbStatus;
  contactName: string;
  email: string;
  contactKyc: DbStatus;
  legalName: string;
  businessNumber: string | null;
  jurisdiction: string | null;
  address: string;
  phone: string | null;
  activity: string;
  website: string | null;
  owners: BusinessOwner[];
  documents: Partial<Record<KybDocKey, string>>;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export async function fetchKyb(): Promise<KybRequest[]> {
  const { data, error } = await supabase
    .from("business_verifications")
    .select("*, profiles(full_name, email, kyc_status)")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as unknown as RowWithProfile[]).map((r) => ({
    id: r.id,
    userId: r.user_id,
    status: r.status,
    contactName: r.profiles?.full_name?.trim() || "Client",
    email: r.profiles?.email ?? "",
    contactKyc: r.profiles?.kyc_status ?? "not_started",
    legalName: r.legal_name,
    businessNumber: r.business_number,
    jurisdiction: r.jurisdiction,
    address: r.address,
    phone: r.phone,
    activity: r.activity,
    website: r.website,
    owners: (r.owners as unknown as BusinessOwner[]) ?? [],
    documents: (r.documents as Partial<Record<KybDocKey, string>>) ?? {},
    reviewNote: r.review_note,
    reviewedAt: r.reviewed_at,
    createdAt: r.created_at,
  }));
}

/** Lien temporaire (5 min) vers un document du dossier. */
export async function getKybDocumentUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from("kyc").createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Approuve ou refuse un dossier, journalise la décision et prévient le client. */
export async function decideKyb(
  req: KybRequest,
  decision: "approved" | "rejected",
  note: string,
): Promise<{ error?: string }> {
  const { data: sess } = await supabase.auth.getSession();
  const reviewer = sess.session?.user?.id ?? null;
  const reviewNote = note.trim() || null;

  const { error } = await supabase
    .from("business_verifications")
    .update({ status: decision, review_note: reviewNote, reviewed_by: reviewer, reviewed_at: new Date().toISOString() })
    .eq("id", req.id);
  if (error) return { error: error.message };

  void logAdminAction({
    action: decision === "approved" ? "kyb.approve" : "kyb.reject",
    entityKind: "kyb",
    entityId: req.id,
    before: { status: req.status },
    after: { status: decision, review_note: reviewNote },
    metadata: { client_user_id: req.userId, legal_name: req.legalName },
  });

  if (req.email) {
    const site = window.location.origin;
    const approved = decision === "approved";
    const html = approved
      ? `<p>Bonjour ${esc(req.contactName)},</p><p>Bonne nouvelle : <b>${esc(req.legalName)}</b> est maintenant vérifiée sur Ooble. Votre entreprise peut acheter et vendre dès maintenant.</p><p><a href="${site}/app">Ouvrir Ooble</a></p>`
      : `<p>Bonjour ${esc(req.contactName)},</p><p>Nous n'avons pas pu valider le dossier de <b>${esc(req.legalName)}</b>.</p>${reviewNote ? `<p><b>Ce qu'il faut corriger :</b><br>${esc(reviewNote).replace(/\n/g, "<br>")}</p>` : ""}<p>Vous pouvez corriger et renvoyer le dossier depuis votre espace.</p><p><a href="${site}/app/entreprise">Corriger mon dossier</a></p>`;
    void sendCustomEmail({
      to: req.email,
      subject: approved ? `${req.legalName} est vérifiée` : `Votre dossier entreprise est à corriger`,
      html,
    });
  }
  return {};
}
