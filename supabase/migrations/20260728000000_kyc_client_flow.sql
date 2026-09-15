-- KYC — flux côté client.
--
-- La table `kyc_verifications` existe déjà (sélection par le propriétaire,
-- sélection + décision par le staff). Il manquait au client la possibilité de
-- CRÉER et de METTRE À JOUR (resoumission) sa propre vérification, ainsi qu'un
-- espace de stockage privé pour les pièces d'identité.

-- ---- Politiques d'écriture pour le propriétaire -------------------------

create policy "Les utilisateurs créent leur vérification KYC"
  on public.kyc_verifications for insert
  with check (auth.uid() = user_id);

create policy "Les utilisateurs mettent à jour leur vérification KYC"
  on public.kyc_verifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---- Stockage privé des pièces (bucket `kyc`) ---------------------------

insert into storage.buckets (id, name, public)
values ('kyc', 'kyc', false)
on conflict (id) do nothing;

-- Chaque fichier est rangé sous un dossier nommé d'après l'uid du propriétaire :
--   kyc/<uid>/<fichier>
create policy "KYC : dépôt de ses propres pièces"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'kyc'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "KYC : lecture de ses propres pièces"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'kyc'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "KYC : le staff lit toutes les pièces"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'kyc'
    and (
      public.has_role(auth.uid(), 'admin')
      or public.has_role(auth.uid(), 'kyc_reviewer')
    )
  );
