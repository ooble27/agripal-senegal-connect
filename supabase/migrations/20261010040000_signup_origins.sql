-- Origine des inscriptions : lieu approximatif (ville, province, pays,
-- d'après la connexion internet, fourni par Vercel) et source (Google,
-- Facebook, lien de campagne…). Écrit une seule fois par compte, par le
-- client lui-même via record_signup_origin ; lu par l'équipe uniquement.
-- `late` : origine enregistrée plus de 2 jours après l'inscription (comptes
-- créés avant cette fonctionnalité) ; le lieu est alors celui d'une connexion
-- plus récente, pas forcément celui de l'inscription.

create table if not exists public.signup_origins (
  user_id uuid primary key references auth.users (id),
  country text,
  region text,
  city text,
  source text,
  medium text,
  campaign text,
  referrer text,
  landing text,
  late boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.signup_origins enable row level security;
create policy "signup_origins lecture equipe" on public.signup_origins
  for select to authenticated using (public.is_staff(auth.uid()));
revoke insert, update on public.signup_origins from anon, authenticated;

create or replace function public.record_signup_origin(
  _country text, _region text, _city text,
  _source text, _medium text, _campaign text, _referrer text, _landing text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  joined timestamptz;
begin
  if uid is null then
    return;
  end if;
  select created_at into joined from public.profiles where id = uid;
  insert into public.signup_origins (user_id, country, region, city, source, medium, campaign, referrer, landing, late)
  values (
    uid,
    left(nullif(trim(_country), ''), 8),
    left(nullif(trim(_region), ''), 64),
    left(nullif(trim(_city), ''), 96),
    left(nullif(trim(_source), ''), 64),
    left(nullif(trim(_medium), ''), 64),
    left(nullif(trim(_campaign), ''), 96),
    left(nullif(trim(_referrer), ''), 200),
    left(nullif(trim(_landing), ''), 200),
    coalesce(joined < now() - interval '2 days', false)
  )
  on conflict (user_id) do nothing;
end;
$$;

revoke all on function public.record_signup_origin(text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.record_signup_origin(text, text, text, text, text, text, text, text) to authenticated;
