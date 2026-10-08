/**
 * Vérification d'entreprise (KYB) côté client : lecture du dernier dossier
 * et dépôt d'un nouveau dossier (infos, personnes, documents).
 *
 * Les documents vont dans le bucket privé « kyc », sous {uid}/kyb/…, que
 * seuls le client et l'équipe KYC peuvent lire.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { peekCache, putCache } from "@/lib/cache";

export type KybStatus = Database["public"]["Enums"]["kyc_status"];

export type OwnerRole = "director" | "owner" | "both";

export interface BusinessOwner {
  name: string;
  role: OwnerRole;
  /** Pourcentage détenu (0 pour un administrateur sans participation). */
  ownership: number;
  birthDate: string;
  country: string;
}

export interface BusinessInfo {
  legalName: string;
  businessNumber: string;
  jurisdiction: string;
  address: string;
  phone: string;
  activity: string;
  website: string;
}

export type KybDocKey = "incorporation" | "registry" | "address_proof";

export const KYB_DOCS: { key: KybDocKey; required: boolean }[] = [
  { key: "incorporation", required: true },
  { key: "registry", required: true },
  { key: "address_proof", required: false },
];

export const KYB_MAX_FILE = 10 * 1024 * 1024;
export const KYB_ACCEPT = "application/pdf,image/jpeg,image/png,image/webp,image/heic";

export interface MyKyb {
  id: string;
  status: KybStatus;
  submittedAt: string;
  reviewNote: string | null;
  info: BusinessInfo;
  owners: BusinessOwner[];
}

/** Dernière vérification d'entreprise connue, sans appel réseau (undefined : pas encore lue). */
export const peekMyKyb = (uid: string | null | undefined) => peekCache<MyKyb | null>(uid ? `kyb:${uid}` : null);

export async function getMyKyb(): Promise<MyKyb | null> {
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user?.id;
  if (!uid) return null;
  return putCache(`kyb:${uid}`, await fetchMyKyb(uid));
}

async function fetchMyKyb(uid: string): Promise<MyKyb | null> {
  const { data: r } = await supabase
    .from("business_verifications")
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!r) return null;
  return {
    id: r.id,
    status: r.status,
    submittedAt: r.created_at,
    reviewNote: r.review_note,
    info: {
      legalName: r.legal_name,
      businessNumber: r.business_number ?? "",
      jurisdiction: r.jurisdiction ?? "",
      address: r.address,
      phone: r.phone ?? "",
      activity: r.activity,
      website: r.website ?? "",
    },
    owners: (r.owners as unknown as BusinessOwner[]) ?? [],
  };
}

async function upload(uid: string, key: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() ?? "pdf").toLowerCase().replace(/[^a-z0-9]/g, "") || "pdf";
  const path = `${uid}/kyb/${key}_${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("kyc").upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

const clean = (s: string) => s.trim() || null;

export async function submitKyb(
  info: BusinessInfo,
  owners: BusinessOwner[],
  files: Partial<Record<KybDocKey, File>>,
): Promise<{ error?: string }> {
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user?.id;
  if (!uid) return { error: "Not authenticated" };

  try {
    const documents: Partial<Record<KybDocKey, string>> = {};
    for (const d of KYB_DOCS) {
      const f = files[d.key];
      if (f) documents[d.key] = await upload(uid, d.key, f);
    }
    const { error } = await supabase.from("business_verifications").insert({
      user_id: uid,
      status: "pending",
      legal_name: info.legalName.trim(),
      business_number: clean(info.businessNumber),
      jurisdiction: clean(info.jurisdiction),
      address: info.address.trim(),
      phone: clean(info.phone),
      activity: info.activity.trim(),
      website: clean(info.website),
      documents,
      owners: owners.map((o) => ({
        name: o.name.trim(),
        role: o.role,
        ownership: Math.max(0, Math.min(100, Number(o.ownership) || 0)),
        birthDate: o.birthDate,
        country: o.country.trim(),
      })),
      attestation: true,
    });
    if (error) return { error: error.message };
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed" };
  }
}
