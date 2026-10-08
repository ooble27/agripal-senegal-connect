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

Si le worker ou Supabase sont indisponibles, le courriel arrive quand même dans
Gmail : on revient simplement au traitement manuel.
