-- Permet au staff (admin / opérateur) de journaliser les changements de statut.
-- Miroir versionné de la migration appliquée en base (idempotent).

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'order_events' and cmd = 'INSERT'
  ) then
    create policy "Staff journalise events" on public.order_events
      for insert to authenticated
      with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'operator'));
  end if;
end $$;
