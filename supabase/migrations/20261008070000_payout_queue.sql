-- Montée en charge : file d'attente des envois USDT et index.
--
-- 1. Verrou par réseau. Un seul envoi à la fois par réseau depuis le
--    portefeuille chaud (le numéro de transaction suivant en dépend). La
--    vérification précédente (« un envoi en cours depuis moins de 2 minutes ? »)
--    n'était pas atomique : deux virements arrivés à la même seconde pouvaient
--    passer ensemble. Le verrou est pris et rendu par usdt-payout ; il expire
--    seul au bout de 90 secondes si la fonction s'arrête en route.
-- 2. File d'attente. Quand plusieurs virements arrivent ensemble, les envois
--    qui trouvent le réseau occupé restaient « paiement reçu » jusqu'à un clic
--    de l'équipe. La tâche « drain-usdt-payouts » les reprend chaque minute.
-- 3. Index pour les écrans et contrôles qui filtrent par sens et statut, et
--    pour l'historique d'un ordre.

create table if not exists public.payout_locks (
  network public.usdt_network primary key,
  locked_until timestamptz not null default 'epoch',
  holder uuid
);
alter table public.payout_locks enable row level security;
-- Aucune politique : lu et écrit seulement par les fonctions ci-dessous.

create or replace function public.claim_payout_lock(_net public.usdt_network, _holder uuid, _seconds integer default 90)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.payout_locks (network) values (_net) on conflict (network) do nothing;
  update public.payout_locks
     set locked_until = now() + make_interval(secs => greatest(10, least(_seconds, 300))), holder = _holder
   where network = _net and locked_until <= now();
  return found;
end;
$$;

create or replace function public.release_payout_lock(_net public.usdt_network, _holder uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.payout_locks set locked_until = now() where network = _net and holder = _holder;
$$;

revoke execute on function public.claim_payout_lock(public.usdt_network, uuid, integer) from public, anon, authenticated;
revoke execute on function public.release_payout_lock(public.usdt_network, uuid) from public, anon, authenticated;
grant execute on function public.claim_payout_lock(public.usdt_network, uuid, integer) to service_role;
grant execute on function public.release_payout_lock(public.usdt_network, uuid) to service_role;

create index if not exists orders_side_status_idx on public.orders (side, status, created_at);
create index if not exists order_events_order_idx on public.order_events (order_id, created_at);

-- Reprise des envois automatiques en attente, chaque minute.
select cron.schedule('drain-usdt-payouts', '* * * * *', $$
  select net.http_post(
    url := 'https://uukxacjjviiktmbikdwp.supabase.co/functions/v1/usdt-payout',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{"action":"drain"}'::jsonb,
    timeout_milliseconds := 120000
  );
$$);
