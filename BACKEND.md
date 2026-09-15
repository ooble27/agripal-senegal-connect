# Backend Ooble — Supabase

Ce document décrit le modèle de données, comment connecter Supabase, et le plan
de branchement écran par écran. **Rien n'est encore branché : l'app tourne sur
des données de démonstration tant que Supabase n'est pas configuré** (voir
`src/integrations/supabase/client.ts` → `isSupabaseConfigured`).

## 1. Modèle de données

Migrations dans `supabase/migrations/` :

| Table | Rôle |
|---|---|
| `profiles` | Profil client (nom, téléphone, statut KYC, limite quotidienne). Créé automatiquement à l'inscription. |
| `orders` | Ordres achat/vente : montants CAD+USDT, taux verrouillé, réseau, adresse, e-mail Interac, statut, **`assigned_to`** (prise en charge). |
| `order_events` | Journal d'audit des transitions de statut. |
| `payment_confirmations` | e-Transfer Interac entrants/sortants. |
| `blockchain_transactions` | Transactions USDT on-chain (entrantes/sortantes). |
| `kyc_verifications` | Vérifications d'identité. |
| `exchange_rates` | Taux CAD/USDT (achat/vente, marge incluse). Lecture publique. |
| `compliance_flags` | Signalements FINTRAC (admins uniquement). |
| `user_roles` + `app_role` | Rôles back-office : `admin`, `operator`, `kyc_reviewer`, `support`, `marketing`. |

**Sécurité (RLS)** : un client ne voit que ses propres données ; le **staff**
(présent dans `user_roles`) voit et traite tout via les fonctions
`public.has_role()` / `public.is_staff()`. Les transitions d'ordre sensibles
passent par des Edge Functions (rôle `service_role`).

### Correspondance réseaux (front → enum `usdt_network`)
`trx → trc20`, `bnb → bep20`, `eth → erc20`, `matic → polygon`, `sol → spl`,
`avax → avalanche`.

## 2. Connexion

### Option A — via Lovable (recommandé)
Bouton **Connect Supabase** : Lovable provisionne le projet, injecte les clés et
applique les migrations de `supabase/migrations/`.

### Option B — manuelle (CLI)
```bash
supabase link --project-ref VOTRE_REF
supabase db push          # applique les migrations
cp .env.example .env      # puis renseigner URL + clé anon
```
`VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` suffisent au front ; les Edge
Functions utilisent en plus la `service_role`.

### Donner le rôle admin à un compte
```sql
insert into public.user_roles (user_id, role)
values ('<uuid-utilisateur>', 'admin');
```

## 3. Plan de branchement (écran par écran)

À faire une fois Supabase connecté — chaque point remplace la source de données
factice par une requête Supabase, sans toucher à l'UI :

1. **Auth** — remplacer `src/lib/session.ts` par `supabase.auth`
   (magic link / mot de passe) ; `RequireAuth` lit la session Supabase.
2. **App client** — Acheter/Vendre créent une ligne `orders` (Edge Function
   `create-order` qui verrouille le taux) ; l'historique lit `orders` du client.
3. **Back-office** — `SEED_ORDERS` → requête `orders` (temps réel via
   `supabase.channel`) ; « Prendre en charge » écrit `assigned_to` ; les
   transitions écrivent `order_events`.
4. **KYC** — `SEED_KYC` → `kyc_verifications` + Storage pour les documents.
5. **Équipe** — `SEED_TEAM` → `user_roles` (+ profils) ; le sélecteur de rôle
   fait un upsert.
6. **Comptabilité** — agrégats calculés sur `orders` (statut `completed`).
7. **Taux** — Edge Function planifiée qui écrit `exchange_rates` ; le front lit
   la dernière ligne au lieu d'appeler CoinGecko directement.
8. **Interac** — Edge Function de réconciliation qui rapproche les e-Transfers
   et fait avancer les ordres.

## 4. Edge Functions à prévoir
`create-order` (verrou de taux), `advance-order` (transitions + audit),
`refresh-rate` (planifiée), `interac-webhook` (réconciliation),
`chain-watcher` (confirmations on-chain).
