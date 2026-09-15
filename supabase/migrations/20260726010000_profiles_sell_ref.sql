-- Référence de vente unique par client (identifie qui a envoyé des USDT).
-- Affichée dans « Mon compte » et sur l'écran de dépôt de vente.
alter table public.profiles add column if not exists sell_ref text;

update public.profiles
set sell_ref = 'OB-' || upper(substr(replace(id::text, '-', ''), 1, 8))
where sell_ref is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_sell_ref_key'
  ) then
    alter table public.profiles add constraint profiles_sell_ref_key unique (sell_ref);
  end if;
end $$;

-- Renseignée automatiquement à l'inscription.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, sell_ref)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.email,
    'OB-' || upper(substr(replace(new.id::text, '-', ''), 1, 8))
  );
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from anon, authenticated;
