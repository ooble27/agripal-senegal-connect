-- Lancement de la plateforme.
--
-- Avant le lancement, tout ce qui est en base vient des tests de l'équipe :
-- le back-office peut le réinitialiser (fonction edge reset-test-data, clé
-- service uniquement). Une fois la plateforme lancée (launched_at rempli,
-- bouton « Démarrer les activités »), la réinitialisation est refusée pour
-- toujours et les protections du registre (conservation 5 ans) s'appliquent
-- à tous, serveur compris.

create table if not exists public.platform_state (
  id boolean primary key default true check (id),
  launched_at timestamptz,
  launched_by uuid,
  last_reset_at timestamptz,
  last_reset_by uuid
);
insert into public.platform_state (id) values (true) on conflict (id) do nothing;

alter table public.platform_state enable row level security;
create policy "platform_state lecture equipe" on public.platform_state
  for select to authenticated using (public.is_staff(auth.uid()));
revoke insert, update on public.platform_state from anon, authenticated;

create or replace function public.platform_launched()
returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce((select launched_at is not null from public.platform_state where id), false); $$;

-- Commandes payées : protégées, sauf réinitialisation des tests avant le
-- lancement (serveur uniquement).
create or replace function public.protect_paid_orders()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.is_trusted_writer() and not public.platform_launched() then
    return old;
  end if;
  if old.status not in ('created', 'awaiting_payment', 'cancelled', 'expired')
     or exists (select 1 from public.usdt_payouts p where p.order_id = old.id)
     or exists (select 1 from public.interac_receipts r where r.order_id = old.id and r.status = 'matched') then
    raise exception 'Commande payée : elle fait partie du registre des opérations (conservation 5 ans) et ne peut pas être supprimée.' using errcode = '42501';
  end if;
  return old;
end;
$$;

-- Registre de conformité : après le lancement, plus personne ne retire rien.
create or replace function public.compliance_no_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not (public.is_trusted_writer() and not public.platform_launched()) then
    raise exception 'Dossier de conformité : conservation obligatoire de 5 ans, suppression impossible.' using errcode = '42501';
  end if;
  return old;
end;
$$;
