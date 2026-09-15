-- Ajout du type de compte (individuel / entreprise) et des champs entreprise.

create type public.account_type as enum ('individual', 'business');

alter table public.profiles
  alter column daily_limit_cad set default 9999,
  add column if not exists account_type public.account_type not null default 'individual',
  add column if not exists business_name text,
  add column if not exists business_number text,
  add column if not exists business_address text,
  add column if not exists business_phone text;

comment on column public.profiles.business_number is 'NEQ (Québec) ou BN/NE (fédéral)';

-- Met à jour le trigger pour gérer le type de compte à l'inscription.
-- Limite journalière identique (9 999 $) pour tous les comptes, individuel ou entreprise.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_account_type public.account_type;
  v_limit numeric(12,2) := 9999.00;
begin
  v_account_type := coalesce(
    (new.raw_user_meta_data->>'account_type')::public.account_type,
    'individual'
  );

  insert into public.profiles (
    id, full_name, email, sell_ref,
    interac_question, interac_answer,
    account_type, business_name, business_number, business_address, business_phone,
    daily_limit_cad
  ) values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    'OB-' || upper(substr(replace(new.id::text, '-', ''), 1, 8)),
    'Code Ooble ?',
    'OB' || upper(substr(replace(new.id::text, '-', ''), 1, 6)),
    v_account_type,
    new.raw_user_meta_data->>'business_name',
    new.raw_user_meta_data->>'business_number',
    new.raw_user_meta_data->>'business_address',
    new.raw_user_meta_data->>'business_phone',
    v_limit
  );
  return new;
end; $$;

revoke execute on function public.handle_new_user() from anon, authenticated;
