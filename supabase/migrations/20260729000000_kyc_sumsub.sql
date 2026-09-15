-- KYC via Sumsub.
--
-- La vérification est désormais gérée par Sumsub ; le statut n'est écrit que par
-- le webhook (fonction edge `sumsub-webhook`, en service role, hors RLS). Un
-- client ne doit donc PAS pouvoir écrire dans `kyc_verifications` — sinon il
-- pourrait se marquer lui-même « approved ». On retire les droits d'écriture
-- client ajoutés pour l'ancien flux manuel. La lecture de sa propre vérification
-- reste autorisée (policy d'origine), tout comme l'accès du staff.

drop policy if exists "Les utilisateurs créent leur vérification KYC" on public.kyc_verifications;
drop policy if exists "Les utilisateurs mettent à jour leur vérification KYC" on public.kyc_verifications;

-- Le bucket privé `kyc` (créé pour l'ancien flux) n'est plus utilisé : Sumsub
-- héberge les pièces. On retire les politiques d'upload/lecture client ; le
-- bucket lui-même est laissé en place (vide) pour ne pas casser d'éventuels
-- objets déjà présents.
drop policy if exists "KYC : dépôt de ses propres pièces" on storage.objects;
drop policy if exists "KYC : lecture de ses propres pièces" on storage.objects;
drop policy if exists "KYC : le staff lit toutes les pièces" on storage.objects;
