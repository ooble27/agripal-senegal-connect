// Fonction edge Ooble — webhook Sumsub.
//
// Sumsub appelle cette URL à chaque changement d'état d'une vérification. On
// vérifie la signature, on traduit le résultat (GREEN → approuvé, RED → refusé)
// et on met à jour `kyc_verifications` pour l'utilisateur concerné
// (externalUserId = id Supabase). Écrit via la service role (hors RLS).
//
// À déclarer côté Sumsub : URL de la fonction + secret de webhook.
// Cette fonction ne doit PAS exiger de JWT : voir supabase/config.toml
//   [functions.sumsub-webhook] verify_jwt = false
//
// Secrets requis :
//   SUMSUB_WEBHOOK_SECRET   secret partagé pour vérifier `x-payload-digest`
//   (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY injectés automatiquement)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const HASH: Record<string, string> = {
  HMAC_SHA1_HEX: "SHA-1",
  HMAC_SHA256_HEX: "SHA-256",
  HMAC_SHA512_HEX: "SHA-512",
};

async function hmacHex(secret: string, msg: string, alg: string): Promise<string> {
  const hash = HASH[alg] ?? "SHA-256";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Type d'événement Sumsub → statut interne (ou null si on ignore). */
function toStatus(type: string, reviewAnswer?: string): "pending" | "approved" | "rejected" | null {
  if (type === "applicantReviewed") {
    if (reviewAnswer === "GREEN") return "approved";
    if (reviewAnswer === "RED") return "rejected";
    return null;
  }
  if (type === "applicantPending" || type === "applicantCreated" || type === "applicantOnHold") {
    return "pending";
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Méthode non autorisée", { status: 405 });

  const raw = await req.text();

  // Vérifie la signature du webhook si un secret est configuré.
  const secret = Deno.env.get("SUMSUB_WEBHOOK_SECRET");
  if (secret) {
    const provided = req.headers.get("x-payload-digest") ?? "";
    const alg = (req.headers.get("x-payload-digest-alg") ?? "HMAC_SHA256_HEX").toUpperCase();
    const computed = await hmacHex(secret, raw, alg);
    if (!provided || computed.toLowerCase() !== provided.toLowerCase()) {
      return new Response("Signature invalide", { status: 401 });
    }
  }

  let evt: Record<string, unknown>;
  try {
    evt = JSON.parse(raw);
  } catch {
    return new Response("JSON invalide", { status: 400 });
  }

  const uid = evt.externalUserId as string | undefined;
  const type = (evt.type as string) ?? "";
  const reviewAnswer = (evt.reviewResult as { reviewAnswer?: string } | undefined)?.reviewAnswer;
  const status = uid ? toStatus(type, reviewAnswer) : null;

  // On répond 200 même quand on ignore, pour que Sumsub ne réessaie pas en boucle.
  if (!uid || !status) return new Response("ok", { status: 200 });

  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const row = {
    provider: "sumsub",
    status,
    external_reference: (evt.applicantId as string | undefined) ?? null,
    result_payload: evt,
  };

  const { data: existing } = await supa
    .from("kyc_verifications")
    .select("id")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    await supa.from("kyc_verifications").update(row).eq("id", existing.id);
  } else {
    await supa.from("kyc_verifications").insert({ user_id: uid, ...row });
  }

  return new Response("ok", { status: 200 });
});
