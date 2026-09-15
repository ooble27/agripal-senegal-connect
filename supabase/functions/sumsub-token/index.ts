// Fonction edge Ooble — génère un jeton d'accès Sumsub pour le WebSDK.
//
// Le client appelle cette fonction (authentifié) ; on identifie l'utilisateur
// via son JWT, puis on demande à Sumsub un access token lié à cet utilisateur
// (externalUserId = id Supabase) pour le niveau de vérification configuré.
//
// Secrets requis (Supabase → Edge Functions → Secrets) :
//   SUMSUB_APP_TOKEN     jeton d'application Sumsub
//   SUMSUB_SECRET_KEY    clé secrète Sumsub (signature des requêtes)
//   SUMSUB_LEVEL_NAME    nom du niveau de vérification (ex. "basic-kyc-level")
//
// SUPABASE_URL / SUPABASE_ANON_KEY sont injectés automatiquement.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

/** Signature Sumsub : HMAC-SHA256 hex de `ts + METHOD + path + body`. */
async function sign(secret: string, ts: number, method: string, path: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${ts}${method}${path}${body}`));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  const appToken = Deno.env.get("SUMSUB_APP_TOKEN");
  const secretKey = Deno.env.get("SUMSUB_SECRET_KEY");
  const level = Deno.env.get("SUMSUB_LEVEL_NAME") ?? "basic-kyc-level";
  if (!appToken || !secretKey) {
    return json({ error: "Sumsub non configuré (SUMSUB_APP_TOKEN / SUMSUB_SECRET_KEY manquants)." }, 500);
  }

  // Identifie l'utilisateur via son JWT.
  const authHeader = req.headers.get("Authorization") ?? "";
  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return json({ error: "Non authentifié." }, 401);

  const ttl = 600;
  const path =
    `/resources/accessTokens?userId=${encodeURIComponent(user.id)}` +
    `&levelName=${encodeURIComponent(level)}&ttlInSecs=${ttl}`;
  const ts = Math.floor(Date.now() / 1000);
  const sig = await sign(secretKey, ts, "POST", path, "");

  const res = await fetch("https://api.sumsub.com" + path, {
    method: "POST",
    headers: {
      "X-App-Token": appToken,
      "X-App-Access-Sig": sig,
      "X-App-Access-Ts": String(ts),
      "Accept": "application/json",
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return json({ error: data?.description ?? "Erreur Sumsub", status: res.status }, 502);
  }
  return json({ token: data.token, userId: user.id, level });
});
