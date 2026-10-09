-- Fermeture de compte : on ne supprime jamais le dossier.
--
-- Remplace la règle de 20261009010000_account_closure.sql. Quand un client
-- supprime son compte, Ooble garde tout : profil, ordres, vérifications,
-- destinataires enregistrés, question Interac. Le compte est seulement
-- fermé (connexion bloquée par la fonction edge delete-account, adresse
-- e-mail libérée) et la fermeture est inscrite au registre
-- account_closures, sans limite de durée. Plus de suppression complète,
-- même pour un compte sans historique.
-- Appliquée en production le 2026-10-09.

create or replace function public.close_account(_uid uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  p record;
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

  -- Fermeture : rien n'est effacé du dossier (profil, ordres, vérifications,
  -- destinataires). Le registre garde la trace de la fermeture.
  insert into public.account_closures (user_id, mode, email, full_name, account_type, retain_until)
  values (_uid, 'closed', p.email, coalesce(p.business_name, p.full_name), p.account_type::text, null)
  on conflict (user_id) do nothing;

  update public.profiles set closed_at = now() where id = _uid;
  return 'closed';
end;
$$;

revoke execute on function public.close_account(uuid) from public, anon, authenticated;
grant execute on function public.close_account(uuid) to service_role;

comment on table public.account_closures is 'Registre des comptes fermés à la demande du client. Le dossier (profil, ordres, vérifications) est conservé sans limite de durée.';
