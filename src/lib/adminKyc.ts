import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { KycRequest, KycStatus } from "@/lib/adminOrders";
import { logAdminAction } from "@/lib/audit";

type DbKycStatus = Database["public"]["Enums"]["kyc_status"];
type KycRow = Database["public"]["Tables"]["kyc_verifications"]["Row"];
type RowWithProfile = KycRow & { profiles: { full_name: string | null; email: string | null } | null };

const DB_TO_DEMO: Record<DbKycStatus, KycStatus> = {
  not_started: "attente",
  pending: "attente",
  approved: "verifie",
  rejected: "refuse",
};
const DEMO_TO_DB: Record<KycStatus, DbKycStatus> = {
  attente: "pending",
  verifie: "approved",
  refuse: "rejected",
};

const DOC_TYPE_LABELS: Record<string, string> = {
  passport: "Passeport",
  drivers_license: "Permis de conduire",
  national_id: "Carte d'identité",
};

const minsAgo = (iso: string) =>
  Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));

export async function fetchKyc(): Promise<KycRequest[]> {
  const { data, error } = await supabase
    .from("kyc_verifications")
    .select("*, profiles(full_name, email)")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as RowWithProfile[]).map((r) => ({
    id: r.id,
    userId: r.user_id,
    clientName: r.profiles?.full_name?.trim() || "Client",
    email: r.profiles?.email ?? "",
    docType: r.doc_type ? (DOC_TYPE_LABELS[r.doc_type] ?? r.doc_type) : "Pièce d'identité",
    documentPaths: (r.document_paths as Record<string, string> | null) ?? null,
    submittedMinsAgo: minsAgo(r.created_at),
    status: DB_TO_DEMO[r.status],
  }));
}

export async function getDocumentUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from("kyc").createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}

export async function setKycStatus(id: string, status: KycStatus): Promise<{ error?: string }> {
  const { data: before } = await supabase
    .from("kyc_verifications")
    .select("id, user_id, status")
    .eq("id", id)
    .maybeSingle();

  const newDbStatus = DEMO_TO_DB[status];
  const { error } = await supabase
    .from("kyc_verifications")
    .update({ status: newDbStatus })
    .eq("id", id);
  if (error) return { error: error.message };

  const action = status === "verifie" ? "kyc.approve" : status === "refuse" ? "kyc.reject" : null;
  if (action) {
    void logAdminAction({
      action,
      entityKind: "kyc",
      entityId: id,
      before,
      after: { ...(before ?? { id }), status: newDbStatus },
      metadata: { client_user_id: before?.user_id ?? null },
    });
  }
  return {};
}
