// Edge function Ooble — envoi de notifications push Web Push.
//
// Appelée par un webhook Supabase Database (pg_notify → webhook) ou
// directement par le back-office pour notifier un utilisateur.
//
// Payload attendu :
//   { user_id, title, body, url? }
//
// Secrets requis :
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto Supabase)
//   VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function base64urlToUint8Array(s: string): Uint8Array {
  const padding = "=".repeat((4 - (s.length % 4)) % 4);
  const raw = atob(s.replace(/-/g, "+").replace(/_/g, "/") + padding);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function importVapidKeys(publicKeyB64: string, privateKeyB64: string) {
  const pubRaw = base64urlToUint8Array(publicKeyB64);
  const privRaw = base64urlToUint8Array(privateKeyB64);

  const publicKey = await crypto.subtle.importKey(
    "raw", pubRaw, { name: "ECDH", namedCurve: "P-256" }, true, []
  );
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    buildPkcs8(privRaw),
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  return { publicKey, privateKey, publicKeyRaw: pubRaw };
}

function buildPkcs8(rawPrivate: Uint8Array): ArrayBuffer {
  const prefix = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13,
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02,
    0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
    0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02,
    0x01, 0x01, 0x04, 0x20,
  ]);
  const suffix = new Uint8Array([
    0xa1, 0x44, 0x03, 0x42, 0x00, 0x04,
  ]);
  const result = new Uint8Array(prefix.length + rawPrivate.length + suffix.length);
  result.set(prefix);
  result.set(rawPrivate, prefix.length);
  // We don't include the public key in PKCS8 — the import reconstructs it.
  return result.buffer;
}

function uint8ToBase64url(arr: Uint8Array): string {
  let s = "";
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createJwt(
  privateKey: CryptoKey,
  aud: string,
  sub: string
): Promise<string> {
  const header = { alg: "ES256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud, exp: now + 86400, sub };

  const enc = new TextEncoder();
  const headerB64 = uint8ToBase64url(enc.encode(JSON.stringify(header)));
  const payloadB64 = uint8ToBase64url(enc.encode(JSON.stringify(payload)));
  const input = `${headerB64}.${payloadB64}`;

  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    enc.encode(input)
  );

  const sigBytes = new Uint8Array(sig);
  let r: Uint8Array, s: Uint8Array;
  if (sigBytes[0] === 0x30) {
    let offset = 2;
    const rLen = sigBytes[offset + 1];
    r = sigBytes.slice(offset + 2, offset + 2 + rLen);
    offset += 2 + rLen;
    const sLen = sigBytes[offset + 1];
    s = sigBytes.slice(offset + 2, offset + 2 + sLen);
  } else {
    r = sigBytes.slice(0, 32);
    s = sigBytes.slice(32, 64);
  }

  const pad32 = (a: Uint8Array) => {
    if (a.length === 32) return a;
    if (a.length > 32) return a.slice(a.length - 32);
    const p = new Uint8Array(32);
    p.set(a, 32 - a.length);
    return p;
  };

  const rawSig = new Uint8Array(64);
  rawSig.set(pad32(r), 0);
  rawSig.set(pad32(s), 32);

  return `${input}.${uint8ToBase64url(rawSig)}`;
}

async function sendWebPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<{ ok: boolean; status: number }> {
  const { publicKey, privateKey } = await importVapidKeys(vapidPublicKey, vapidPrivateKey);

  const clientPublicKey = await crypto.subtle.importKey(
    "raw",
    base64urlToUint8Array(sub.p256dh),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  const localKeys = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: clientPublicKey },
      localKeys.privateKey,
      256
    )
  );

  const authSecret = base64urlToUint8Array(sub.auth);
  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeys.publicKey)
  );

  const enc = new TextEncoder();

  const ikm1 = await crypto.subtle.importKey("raw", authSecret, { name: "HKDF" }, false, ["deriveBits"]);
  const salt1 = new Uint8Array([
    ...enc.encode("WebPush: info\0"),
    ...base64urlToUint8Array(sub.p256dh),
    ...localPublicKeyRaw,
  ]);
  const pseudoRandomKey = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: sharedSecret, info: salt1 },
      ikm1,
      256
    )
  );

  const prk = await crypto.subtle.importKey("raw", pseudoRandomKey, { name: "HKDF" }, false, ["deriveBits"]);

  const cekInfo = enc.encode("Content-Encoding: aes128gcm\0");
  const cek = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: cekInfo },
      prk,
      128
    )
  );

  const nonceInfo = enc.encode("Content-Encoding: nonce\0");
  const nonce = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: nonceInfo },
      prk,
      96
    )
  );

  const payloadBytes = enc.encode(payload);
  const paddedPayload = new Uint8Array(payloadBytes.length + 2);
  paddedPayload.set(payloadBytes);
  paddedPayload[payloadBytes.length] = 2;

  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, paddedPayload)
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, encrypted.length + 86 + 1);

  const header = new Uint8Array([
    ...salt,
    ...recordSize,
    65,
    ...localPublicKeyRaw,
  ]);

  const body = new Uint8Array(header.length + encrypted.length);
  body.set(header);
  body.set(encrypted, header.length);

  const url = new URL(sub.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const jwt = await createJwt(privateKey, audience, vapidSubject);
  const vapidPubB64 = vapidPublicKey;

  const resp = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      TTL: "86400",
      Authorization: `vapid t=${jwt}, k=${vapidPubB64}`,
    },
    body,
  });

  return { ok: resp.ok, status: resp.status };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:support@ooble.ca";

  if (!supabaseUrl || !serviceKey || !vapidPublic || !vapidPrivate) {
    return json({ error: "Config manquante" }, 500);
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return json({ error: "JSON invalide" }, 400); }

  const userId = body.user_id as string;
  const title = (body.title as string) ?? "Ooble";
  const msg = (body.body as string) ?? "";
  const url = (body.url as string) ?? "/app";

  if (!userId) return json({ error: "user_id requis" }, 400);

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs || subs.length === 0) return json({ ok: true, sent: 0 });

  const payload = JSON.stringify({ title, body: msg, url });
  let sent = 0;
  const stale: string[] = [];

  for (const sub of subs) {
    try {
      const result = await sendWebPush(sub, payload, vapidPublic, vapidPrivate, vapidSubject);
      if (result.ok) {
        sent++;
      } else if (result.status === 404 || result.status === 410) {
        stale.push(sub.endpoint);
      }
    } catch (e) {
      console.error("push-notify: erreur envoi", e);
    }
  }

  if (stale.length > 0) {
    await admin.from("push_subscriptions").delete().in("endpoint", stale);
  }

  return json({ ok: true, sent, cleaned: stale.length });
});
