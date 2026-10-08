# Email Worker — interac@ooble.ca

Remplace la règle de transfert simple de `interac@ooble.ca` dans Cloudflare
Email Routing. Le worker :

1. transfère chaque courriel, inchangé, vers la boîte Gmail (comme aujourd'hui) ;
2. envoie une copie brute, signée (HMAC), à la fonction Supabase `interac-ingest`,
   qui vérifie la signature DKIM d'Interac puis rapproche l'avis de l'achat.

Aucun argent ne bouge : un avis rapproché fait seulement passer l'achat à
« paiement reçu ». L'envoi des USDT reste un clic de l'équipe dans l'admin.

## Mise en place (une fois)

1. Générer un secret long et aléatoire (par exemple dans un gestionnaire de mots
   de passe, 40 caractères ou plus).
2. Supabase → Edge Functions → Secrets : ajouter `INTERAC_INGEST_SECRET` = ce secret.
3. Cloudflare → Workers & Pages → Créer un worker `ooble-interac-email`, coller
   `worker.js`, puis dans Settings → Variables :
   - `FORWARD_TO` = l'adresse Gmail actuelle (déjà vérifiée dans Email Routing) ;
   - `INGEST_URL` = `https://uukxacjjviiktmbikdwp.supabase.co/functions/v1/interac-ingest` ;
   - `INTERAC_INGEST_SECRET` = le même secret (type « Secret »).
4. Cloudflare → ooble.ca → Email → Email Routing → Routing rules : modifier la
   règle `interac@ooble.ca` → action « Send to a Worker » → `ooble-interac-email`.

### En ligne de commande (variante)

Avec un jeton API Cloudflare (`CLOUDFLARE_API_TOKEN`, droits Workers Scripts:Edit
et Email Routing Rules:Edit sur ooble.ca) :

```sh
cd cloudflare/interac-email-worker
npx wrangler deploy                              # FORWARD_TO et INGEST_URL sont dans wrangler.toml
npx wrangler secret put INTERAC_INGEST_SECRET    # coller le même secret que dans Supabase
```

La règle de routage (étape 4) se change dans le tableau de bord, ou par l'API
Email Routing (`PUT /zones/{zone_id}/email/routing/rules/{rule_id}` avec
l'action `{"type":"worker","value":["ooble-interac-email"]}`).

Si le worker ou Supabase sont indisponibles, le courriel arrive quand même dans
Gmail : on revient simplement au traitement manuel.
