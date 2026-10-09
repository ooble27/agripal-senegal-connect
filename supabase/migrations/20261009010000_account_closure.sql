-- Suppression de compte demandée par le client.
--
-- Ooble doit conserver 5 ans les dossiers d'identité et d'opérations
-- (CANAFE). Une suppression « en dur » de l'utilisateur effacerait en
-- cascade son profil et ses vérifications : interdit, et impossible dès
-- qu'il a des ordres. Deux cas :
--   • aucun ordre, aucune vérification, aucun dossier de conformité :
--     suppression complète (la fonction edge supprime l'utilisateur) ;
--   • sinon : fermeture. On efface ce qui n'est pas exigé par la loi
--     (destinataires enregistrés, notifications, question Interac,
--     téléphone), on garde le profil, les ordres et les
--     vérifications jusqu'à la fin de la durée légale, et la fonction edge
--     bloque la connexion et libère l'adresse e-mail.
-- Refusée tant qu'un ordre est en cours, et pour un compte de l'équipe.
-- Appliquée en production le 2026-10-09.

alter table public.profiles add column if not exists closed_at timestamptz;

create table if not exists public.account_closures (
  user_id uuid primary key,
  mode text not null check (mode in ('deleted', 'closed')),
  email text,
  full_name text,
  account_type text,
  closed_at timestamptz not null default now(),
  retain_until timestamptz
);
alter table public.account_closures enable row level security;
drop policy if exists "Staff lit les fermetures de compte" on public.account_closures;
create policy "Staff lit les fermetures de compte"
  on public.account_closures for select
  using (public.is_staff(auth.uid()));

create or replace function public.close_account(_uid uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  p record;
  has_records boolean;
begin
  if session_user = 'authenticator' and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Réservé au serveur.' using errcode = '42501';
  end if;

  select * into p from public.profiles where id = _uid;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  if p.closed_at is not null then
    return 'already';
  end if;
  if exists (select 1 from public.user_roles where user_id = _uid) then
    raise exception 'STAFF' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.orders
     where user_id = _uid and status in ('created', 'awaiting_payment', 'payment_received', 'settling')
  ) then
    raise exception 'ACTIVE_ORDERS' using errcode = '55000';
  end if;

  has_records :=
    exists (select 1 from public.orders where user_id = _uid)
    or exists (select 1 from public.kyc_verifications where user_id = _uid)
    or exists (select 1 from public.business_verifications where user_id = _uid)
    or exists (select 1 from public.compliance_flags where user_id = _uid)
    or exists (select 1 from public.compliance_alerts where user_id = _uid)
    or exists (select 1 from public.compliance_declarations where user_id = _uid);

  if not has_records then
    -- Rien à conserver : aucune donnée personnelle gardée dans le registre.
    insert into public.account_closures (user_id, mode, account_type)
    values (_uid, 'deleted', p.account_type::text)
    on conflict (user_id) do nothing;
    return 'delete';
  end if;

  insert into public.account_closures (user_id, mode, email, full_name, account_type, retain_until)
  values (_uid, 'closed', p.email, coalesce(p.business_name, p.full_name), p.account_type::text, now() + interval '5 years')
  on conflict (user_id) do nothing;

  update public.profiles
     set closed_at = now(), interac_question = null, interac_answer = null, phone = null
   where id = _uid;
  -- La fonction edge delete-account efface ensuite les destinataires
  -- enregistrés et les notifications, bloque la connexion et libère l'e-mail.
  return 'closed';
end;
$$;

revoke execute on function public.close_account(uuid) from public, anon, authenticated;
grant execute on function public.close_account(uuid) to service_role;
