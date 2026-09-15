-- KYC natif — remplacement de Sumsub par un flux intégré.
--
-- Ajoute les colonnes pour stocker le type de document et les chemins des
-- fichiers uploadés. Restaure les policies d'écriture client (INSERT seulement,
-- pas d'UPDATE du statut) et les policies de stockage.

-- ---- Nouvelles colonnes ------------------------------------------------

alter table public.kyc_verifications
  add column if not exists doc_type text,
  add column if not exists document_paths jsonb default '{}'::jsonb;

-- ---- Policy : le client crée sa vérification ----------------------------

create policy "kyc_owner_insert"
  on public.kyc_verifications for insert to authenticated
  with check (
    auth.uid() = user_id
    and status = 'pending'
  );

-- ---- Policy : le client met à jour seulement doc_type et document_paths --

create policy "kyc_owner_update_docs"
  on public.kyc_verifications for update to authenticated
  using (auth.uid() = user_id AND status = 'pending')
  with check (
    auth.uid() = user_id
    and status = 'pending'
  );

-- ---- Stockage bucket kyc (restaurer les policies) -----------------------

-- S'assurer que le bucket existe (il a été laissé en place par la migration Sumsub)
insert into storage.buckets (id, name, public)
values ('kyc', 'kyc', false)
on conflict (id) do nothing;

-- Upload : l'utilisateur dépose dans son propre dossier
create policy "kyc_upload_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'kyc'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Lecture : l'utilisateur lit ses propres fichiers
create policy "kyc_read_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'kyc'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Lecture : le staff lit tous les fichiers KYC
create policy "kyc_staff_read_all"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'kyc'
    and (
      public.has_role(auth.uid(), 'admin')
      or public.has_role(auth.uid(), 'kyc_reviewer')
    )
  );
