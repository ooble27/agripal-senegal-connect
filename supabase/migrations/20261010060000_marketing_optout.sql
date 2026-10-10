-- Désabonnement des courriels de campagne (Loi canadienne anti-pourriel).
--
-- Chaque adresse qui reçoit une campagne obtient un jeton aléatoire ; le
-- lien « Se désabonner » du courriel porte ce jeton. Les courriels de
-- service (commandes, vérification, sécurité) ne sont pas concernés.

create table if not exists public.marketing_optout (
  email text primary key,
  token uuid not null unique default gen_random_uuid(),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.marketing_optout enable row level security;

create policy marketing_optout_staff_read on public.marketing_optout
  for select using (public.is_staff(auth.uid()));

-- Staff : prépare un envoi. Crée les jetons manquants et indique qui est désabonné.
create or replace function public.campaign_prepare(p_emails text[])
returns table (email text, token uuid, unsubscribed boolean)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff(auth.uid()) then
    raise exception 'FORBIDDEN';
  end if;

  insert into public.marketing_optout (email)
  select distinct lower(trim(e))
  from unnest(p_emails) as e
  where position('@' in coalesce(e, '')) > 1
  on conflict on constraint marketing_optout_pkey do nothing;

  return query
  select m.email, m.token, m.unsubscribed_at is not null
  from public.marketing_optout m
  where m.email in (select lower(trim(e)) from unnest(p_emails) as e);
end;
$$;

revoke all on function public.campaign_prepare(text[]) from public, anon;
grant execute on function public.campaign_prepare(text[]) to authenticated;

-- Public : se désabonner (ou se réabonner) avec le jeton du courriel.
-- Renvoie l'adresse masquée, ou null si le jeton est inconnu.
create or replace function public.marketing_unsubscribe(p_token uuid, p_subscribe boolean default false)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  update public.marketing_optout
     set unsubscribed_at = case when p_subscribe then null else coalesce(unsubscribed_at, now()) end
   where token = p_token
  returning marketing_optout.email into v_email;

  if v_email is null then
    return null;
  end if;

  return left(v_email, 1) || repeat('•', greatest(length(split_part(v_email, '@', 1)) - 1, 2))
         || '@' || split_part(v_email, '@', 2);
end;
$$;

grant execute on function public.marketing_unsubscribe(uuid, boolean) to anon, authenticated;
