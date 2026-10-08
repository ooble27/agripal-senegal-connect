// Email Worker Cloudflare — interac@ooble.ca
//
// 1. Transfère le courriel tel quel vers la boîte Gmail (comme la règle de
//    transfert actuelle) : rien ne change pour la lecture humaine.
// 2. Envoie le message brut (MIME) à la fonction Supabase `interac-ingest`,
//    signé par HMAC-SHA256 avec un secret partagé. Le message est lu ici AVANT
//    le transfert : la signature DKIM d'Interac reste vérifiable.
//
// Variables du worker (Cloudflare → Workers → ce worker → Settings → Variables) :
//   FORWARD_TO              adresse Gmail de destination (déjà vérifiée dans Email Routing)
//   INGEST_URL              https://uukxacjjviiktmbikdwp.supabase.co/functions/v1/interac-ingest
//   INTERAC_INGEST_SECRET   secret partagé (type « Secret »), identique au secret Supabase
//
// Si l'envoi à Ooble échoue, le courriel arrive quand même dans Gmail : on
// retombe sur le traitement manuel, rien n'est perdu.

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

async function sign(secret, ts, body) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prefix = new TextEncoder().encode(`${ts}.`);
  const data = new Uint8Array(prefix.length + body.byteLength);
  data.set(prefix);
  data.set(new Uint8Array(body), prefix.length);
  return hex(await crypto.subtle.sign("HMAC", key, data));
}

async function post(raw, env) {
  const ts = String(Math.floor(Date.now() / 1000));
  const res = await fetch(env.INGEST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "message/rfc822",
      "X-Ooble-Timestamp": ts,
      "X-Ooble-Signature": await sign(env.INTERAC_INGEST_SECRET, ts, raw),
    },
    body: raw,
  });
  console.log("interac-ingest", res.status, (await res.text()).slice(0, 300));
}

export default {
  async email(message, env, ctx) {
    let raw = null;
    try {
      raw = await new Response(message.raw).arrayBuffer();
    } catch (e) {
      console.log("lecture du message impossible", e);
    }
    // La copie Gmail passe en premier et ne dépend pas d'Ooble.
    await message.forward(env.FORWARD_TO);
    if (raw && env.INGEST_URL && env.INTERAC_INGEST_SECRET) {
      ctx.waitUntil(post(raw, env).catch((e) => console.log("envoi à Ooble impossible", e)));
    }
  },
};
