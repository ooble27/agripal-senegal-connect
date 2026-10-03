-- Durcissement des fonctions internes (alertes du conseiller de sécurité
-- Supabase). Les triggers continuent de fonctionner : le droit EXECUTE n'est
-- vérifié qu'à la création d'un trigger, pas à son déclenchement.
--
-- has_role et is_staff restent appelables : les politiques RLS en ont besoin.
--
-- Déjà appliquée en production le 2026-10-03 ; idempotente.

alter function public.notify_order_status_change() set search_path = public;
alter function public.sync_kyc_status_to_profile() set search_path = public;
alter function public.update_thread_on_message() set search_path = public;

revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.notify_order_status_change() from anon, authenticated, public;
revoke execute on function public.sync_kyc_status_to_profile() from anon, authenticated, public;
revoke execute on function public.update_thread_on_message() from anon, authenticated, public;
revoke execute on function public.rls_auto_enable() from anon, authenticated, public;
