/**
 * KYC côté client — lecture de l'état de vérification.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type KycDbStatus = Database["public"]["Enums"]["kyc_status"];

export interface MyKyc {
  status: KycDbStatus;
  submittedAt: string;
}

/** Vérification la plus récente de l'utilisateur connecté (ou null). */
export async function getMyKyc(): Promise<MyKyc | null> {
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user?.id;
  if (!uid) return null;

  const { data: row } = await supabase
    .from("kyc_verifications")
    .select("status, created_at")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!row) return null;

  return { status: row.status, submittedAt: row.created_at };
}
