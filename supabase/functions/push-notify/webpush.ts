// Web Push sans dépendance : chiffrement du message (RFC 8291, aes128gcm,
// RFC 8188) et signature VAPID (RFC 8292, ES256). Vérifié avec le vecteur
// de test de l'annexe A de la RFC 8291 (webpush.test.ts).

const enc = new TextEncoder();

export function b64uDecode(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const raw = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function b64uEncode(a: Uint8Array): string {
  let s = "";
  for (const b of a) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};

/** Clé P-256 au format JWK à partir de la clé publique brute (65 octets). */
const jwkFromRaw = (publicRaw: Uint8Array, privateD?: Uint8Array): JsonWebKey => ({
  kty: "EC",
  crv: "P-256",
  x: b64uEncode(publicRaw.slice(1, 33)),
  y: b64uEncode(publicRaw.slice(33, 65)),
  ...(privateD ? { d: b64uEncode(privateD) } : {}),
  ext: true,
});

/** HKDF (extraction + expansion) : `bytes` octets dérivés de `ikm`. */
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, bytes: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, bytes * 8));
}

export interface EncryptOptions {
  /** Pour les tests uniquement : sel et clé éphémère imposés. */
  salt?: Uint8Array;
  serverKeys?: { publicRaw: Uint8Array; privateD: Uint8Array };
}

/**
 * Chiffre `plaintext` pour l'abonnement (clé publique `p256dh` et secret
 * `auth` du navigateur). Renvoie le corps à poster (en-tête aes128gcm inclus).
 */
export async function encryptPayload(
  plaintext: Uint8Array, p256dh: string, auth: string, opts: EncryptOptions = {},
): Promise<Uint8Array> {
  const uaPublic = b64uDecode(p256dh);
  const authSecret = b64uDecode(auth);

  // Clé éphémère du serveur (une par message).
  let asPrivate: CryptoKey;
  let asPublic: Uint8Array;
  if (opts.serverKeys) {
    asPublic = opts.serverKeys.publicRaw;
    asPrivate = await crypto.subtle.importKey(
      "jwk", jwkFromRaw(asPublic, opts.serverKeys.privateD), { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"],
    );
  } else {
    const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]) as CryptoKeyPair;
    asPrivate = pair.privateKey;
    asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  }

  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, asPrivate, 256));

  // RFC 8291 §3.4 : IKM = HKDF(salt = auth, ikm = ecdh, info = "WebPush: info" 0 ua as).
  const keyInfo = concat(enc.encode("WebPush: info\0"), uaPublic, asPublic);
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32);

  // RFC 8188 : clé de contenu et nonce dérivés avec le sel du message.
  const salt = opts.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  // Un seul enregistrement : texte suivi du délimiteur 0x02.
  const record = concat(plaintext, new Uint8Array([2]));
  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, record));

  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, cipher);
}

/** En-tête Authorization VAPID (JWT ES256 signé avec la clé privée du serveur). */
export async function vapidAuthorization(endpoint: string, subject: string, publicKey: string, privateKey: string): Promise<string> {
  const pub = b64uDecode(publicKey);
  const key = await crypto.subtle.importKey(
    "jwk", jwkFromRaw(pub, b64uDecode(privateKey)), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"],
  );
  const u = new URL(endpoint);
  const header = b64uEncode(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64uEncode(enc.encode(JSON.stringify({
    aud: `${u.protocol}//${u.host}`,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: subject,
  })));
  // WebCrypto signe au format brut r || s (64 octets), celui qu'attend un JWT.
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(`${header}.${claims}`)));
  return `vapid t=${header}.${claims}.${b64uEncode(sig)}, k=${publicKey}`;
}

export interface Subscription { endpoint: string; p256dh: string; auth: string }

/** Envoie un message à un abonnement. Renvoie le code HTTP du service push. */
export async function sendWebPush(
  sub: Subscription, payload: string, vapid: { publicKey: string; privateKey: string; subject: string },
): Promise<{ ok: boolean; status: number; text?: string }> {
  const body = await encryptPayload(enc.encode(payload), sub.p256dh, sub.auth);
  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      TTL: "86400",
      Urgency: "high",
      Authorization: await vapidAuthorization(sub.endpoint, vapid.subject, vapid.publicKey, vapid.privateKey),
    },
    body,
  });
  const text = res.ok ? undefined : (await res.text().catch(() => "")).slice(0, 200);
  return { ok: res.ok, status: res.status, text };
}
