/**
 * KYC côté client — lecture de l'état de vérification.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { peekCache, putCache } from "@/lib/cache";

export type KycDbStatus = Database["public"]["Enums"]["kyc_status"];

export interface MyKyc {
  status: KycDbStatus;
  submittedAt: string;
  /** Motif donné par l'équipe en cas de refus. */
  reviewNote: string | null;
}

/** Dernière vérification connue, sans appel réseau (undefined : pas encore lue). */
export const peekMyKyc = (uid: string | null | undefined) => peekCache<MyKyc | null>(uid ? `kyc:${uid}` : null);

/** Vérification la plus récente de l'utilisateur connecté (ou null). */
export async function getMyKyc(): Promise<MyKyc | null> {
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user?.id;
  if (!uid) return null;
  return putCache(`kyc:${uid}`, await fetchMyKyc(uid));
}

async function fetchMyKyc(uid: string): Promise<MyKyc | null> {

  const { data: row } = await supabase
    .from("kyc_verifications")
    .select("status, created_at, review_note")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row) return null;

  return { status: row.status, submittedAt: row.created_at, reviewNote: row.review_note };
}
