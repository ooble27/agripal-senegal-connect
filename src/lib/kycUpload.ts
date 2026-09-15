import { supabase } from "@/integrations/supabase/client";

export type DocType = "passport" | "drivers_license" | "national_id";

export interface KycDocPaths {
  id_front: string;
  id_back?: string;
  selfie: string;
}

async function uploadFile(uid: string, key: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${uid}/${key}_${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("kyc").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}

export async function submitKycDocuments(
  docType: DocType,
  files: { idFront: File; idBack?: File; selfie: File },
): Promise<{ error?: string }> {
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user?.id;
  if (!uid) return { error: "Not authenticated" };

  try {
    const paths: KycDocPaths = {
      id_front: await uploadFile(uid, "id_front", files.idFront),
      selfie: await uploadFile(uid, "selfie", files.selfie),
    };
    if (files.idBack) {
      paths.id_back = await uploadFile(uid, "id_back", files.idBack);
    }

    const { error } = await supabase.from("kyc_verifications").insert({
      user_id: uid,
      provider: "native",
      status: "pending",
      doc_type: docType,
      document_paths: paths,
    });
    if (error) return { error: error.message };
    return {};
  } catch (e: any) {
    return { error: e.message ?? "Upload failed" };
  }
}
