-- Réinitialiser la vérification d'entreprise d'un client (back-office).
--
-- Supprime ses dossiers KYB et remet profiles.business_status à
-- « not_started » : le client repart d'un dossier vide. Réservé aux admins
-- (le staff n'a pas le droit de modifier le profil d'un client directement).
-- Les infos d'entreprise du profil et les fichiers déposés sont conservés ;
-- l'action est journalisée côté client (admin_audit_log, « kyb.reset »).
--
-- Idempotente ; déjà appliquée en production le 2026-10-07.

create or replace function public.reset_business_verification(_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Réservé aux administrateurs.' using errcode = '42501';
  end if;

  delete from public.business_verifications where user_id = _user_id;
  get diagnostics n = row_count;

  update public.profiles
     set business_status = 'not_started'
   where id = _user_id and account_type = 'business';

  return n;
end;
$$;

revoke execute on function public.reset_business_verification(uuid) from public, anon;
grant execute on function public.reset_business_verification(uuid) to authenticated;
