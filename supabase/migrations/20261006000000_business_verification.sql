-- Vérification des comptes entreprise (KYB).
--
-- Les Conditions (parties 4 et 5) exigent, pour une entité : ses documents
-- constitutifs, ses administrateurs et chaque personne qui en détient 25 % ou
-- plus. Aucune opération ne peut être exécutée avant cette vérification.
--
--   • business_verifications : un dossier par soumission (infos, documents,
--     personnes), examiné par l'équipe KYC.
--   • profiles.business_status : statut synchronisé depuis le dernier dossier.
--   • À l'approbation, les infos vérifiées remplacent celles du profil.
--   • Un compte entreprise non vérifié ne peut pas créer d'ordre.
--
-- Les documents sont rangés dans le bucket privé « kyc », sous
-- {user_id}/kyb/… (policies existantes : dépôt et lecture de son dossier,
-- lecture par admin / kyc_reviewer).
--
-- Idempotente ; déjà appliquée en production le 2026-10-06.

alter table public.profiles
  add column if not exists business_status public.kyc_status not null default 'not_started';

create table if not exists public.business_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.kyc_status not null default 'pending',
  legal_name text not null check (char_length(legal_name) between 1 and 200),
  business_number text check (char_length(business_number) <= 60),
  jurisdiction text check (char_length(jurisdiction) <= 60),
  address text not null check (char_length(address) between 1 and 300),
  phone text check (char_length(phone) <= 40),
  activity text not null check (char_length(activity) between 1 and 500),
  website text check (char_length(website) <= 200),
  documents jsonb not null default '{}'::jsonb,
  owners jsonb not null default '[]'::jsonb check (jsonb_typeof(owners) = 'array' and jsonb_array_length(owners) between 1 and 20),
  attestation boolean not null default false check (attestation),
  review_note text check (char_length(review_note) <= 1000),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_business_verifications_user on public.business_verifications(user_id, created_at desc);
create index if not exists idx_business_verifications_status on public.business_verifications(status, created_at desc);

alter table public.business_verifications enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'business_verifications' and policyname = 'kyb_owner_select') then
    create policy "kyb_owner_select" on public.business_verifications for select to authenticated
      using (auth.uid() = user_id);
  end if;
  -- Le client dépose un dossier « en attente » pour son propre compte entreprise.
  if not exists (select 1 from pg_policies where tablename = 'business_verifications' and policyname = 'kyb_owner_insert') then
    create policy "kyb_owner_insert" on public.business_verifications for insert to authenticated
      with check (
        auth.uid() = user_id
        and status = 'pending'
        and review_note is null and reviewed_by is null and reviewed_at is null
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.account_type = 'business')
      );
  end if;
  if not exists (select 1 from pg_policies where tablename = 'business_verifications' and policyname = 'kyb_staff_select') then
    create policy "kyb_staff_select" on public.business_verifications for select to authenticated
      using (public.is_staff(auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'business_verifications' and policyname = 'kyb_reviewer_update') then
    create policy "kyb_reviewer_update" on public.business_verifications for update to authenticated
      using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'kyc_reviewer'))
      with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'kyc_reviewer'));
  end if;
end $$;

create or replace trigger business_verifications_touch
  before update on public.business_verifications
  for each row execute function public.touch_updated_at();

-- Statut du dossier → profil ; à l'approbation, les infos vérifiées.
create or replace function public.sync_business_status_to_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    update public.profiles
       set business_status = new.status,
           business_name    = case when new.status = 'approved' then new.legal_name else business_name end,
           business_number  = case when new.status = 'approved' then new.business_number else business_number end,
           business_address = case when new.status = 'approved' then new.address else business_address end,
           business_phone   = case when new.status = 'approved' then coalesce(new.phone, business_phone) else business_phone end
     where id = new.user_id;
  end if;
  return new;
end;
$$;

create or replace trigger trg_sync_business_status
  after insert or update on public.business_verifications
  for each row execute function public.sync_business_status_to_profile();

revoke execute on function public.sync_business_status_to_profile() from anon, authenticated, public;

-- ---- Profils : statut entreprise et infos entreprise protégés -----------
-- (remplace la version du 2026-10-03 en ajoutant ces champs)

create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_trusted_writer() then
    return new;
  end if;

  -- Statuts de vérification : seulement l'équipe KYC / admin.
  if not (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'kyc_reviewer')) then
    new.kyc_status := old.kyc_status;
    new.business_status := old.business_status;
  end if;

  -- Limite, e-mail, référence, type de compte et infos entreprise : admin.
  -- (Le client met à jour son entreprise en déposant un nouveau dossier.)
  if not public.has_role(auth.uid(), 'admin') then
    new.daily_limit_cad := old.daily_limit_cad;
    new.email := old.email;
    new.sell_ref := old.sell_ref;
    new.account_type := old.account_type;
    new.business_name := old.business_name;
    new.business_number := old.business_number;
    new.business_address := old.business_address;
    new.business_phone := old.business_phone;
  end if;

  new.id := old.id;
  new.created_at := old.created_at;
  return new;
end;
$$;

-- ---- Ordres : une entreprise doit être vérifiée -------------------------
-- (remplace la version du 2026-10-03 en ajoutant ce contrôle)

create or replace function public.enforce_order_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  r record;
  ref_rate numeric;
  tolerance numeric;
begin
  if public.is_trusted_writer()
     or public.has_role(auth.uid(), 'admin')
     or public.has_role(auth.uid(), 'operator') then
    return new;
  end if;

  if exists (
    select 1 from public.profiles p
     where p.id = new.user_id and p.account_type = 'business' and p.business_status <> 'approved'
  ) then
    raise exception 'Votre entreprise doit être vérifiée avant de passer un ordre.'
      using errcode = '42501';
  end if;

  new.status := 'created';
  new.fee_cad := 0;
  new.assigned_to := null;
  new.rate_locked_until := now() + interval '15 minutes';
  new.created_at := now();
  new.updated_at := now();

  select buy_rate, sell_rate, fetched_at into r
    from public.exchange_rates order by fetched_at desc limit 1;

  if found then
    ref_rate := case when new.side = 'buy' then r.buy_rate else r.sell_rate end;
    tolerance := case when r.fetched_at > now() - interval '1 hour' then 0.015 else 0.05 end;
    if new.locked_rate is null or ref_rate is null or ref_rate <= 0
       or abs(new.locked_rate - ref_rate) / ref_rate > tolerance then
      raise exception 'Le taux a changé. Actualisez la page puis réessayez.'
        using errcode = '22023';
    end if;
  end if;

  if new.side = 'buy' then
    new.usdt_amount := round(new.cad_amount / new.locked_rate, 6);
  else
    new.cad_amount := round(new.usdt_amount * new.locked_rate, 2);
  end if;
  return new;
end;
$$;
