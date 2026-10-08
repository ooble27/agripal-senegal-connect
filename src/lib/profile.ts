import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AccountType = Database["public"]["Enums"]["account_type"];
type KycDbStatus = Database["public"]["Enums"]["kyc_status"];

export interface MyProfile {
  fullName: string | null;
  email: string | null;
  sellRef: string | null;
  interacQuestion: string | null;
  interacAnswer: string | null;
  accountType: AccountType;
  businessName: string | null;
  businessNumber: string | null;
  businessAddress: string | null;
  businessPhone: string | null;
  businessStatus: KycDbStatus;
}

/**
 * Dernier profil chargé, gardé en mémoire : les pages de l'app l'affichent
 * tout de suite au lieu d'attendre le serveur à chaque navigation (le
 * profil est relu en arrière-plan et le cache mis à jour).
 */
let cached: { uid: string; profile: MyProfile } | null = null;

/** Profil déjà chargé pour cet utilisateur, sans appel réseau (ou undefined). */
export function peekMyProfile(uid: string | null | undefined): MyProfile | undefined {
  return uid && cached?.uid === uid ? cached.profile : undefined;
}

export async function getMyProfile(): Promise<MyProfile | null> {
  const { data: auth } = await supabase.auth.getSession();
  const uid = auth.session?.user?.id;
  if (!uid) { cached = null; return null; }
  const profile = await fetchMyProfile(uid);
  if (profile) cached = { uid, profile };
  return profile;
}

async function fetchMyProfile(uid: string): Promise<MyProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, email, sell_ref, interac_question, interac_answer, account_type, business_name, business_number, business_address, business_phone, business_status")
    .eq("id", uid)
    .maybeSingle();
  if (error || !data) return null;

  let question = data.interac_question;
  let answer = data.interac_answer;

  if (!question || !answer) {
    const gen = generateInteracQA(uid);
    question = gen.question;
    answer = gen.answer;
    await supabase
      .from("profiles")
      .update({ interac_question: question, interac_answer: answer })
      .eq("id", uid);
  }

  return {
    fullName: data.full_name,
    email: data.email,
    sellRef: data.sell_ref,
    interacQuestion: question,
    interacAnswer: answer,
    accountType: data.account_type,
    businessName: data.business_name,
    businessNumber: data.business_number,
    businessAddress: data.business_address,
    businessPhone: data.business_phone,
    businessStatus: data.business_status,
  };
}

function generateInteracQA(uid: string) {
  const code = uid.replace(/-/g, "").slice(0, 6).toUpperCase();
  return {
    question: "Code Ooble ?",
    answer: `OB${code}`,
  };
}
