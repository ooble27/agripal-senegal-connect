-- Ventes : détection automatique des USDT reçus.
--
-- La fonction edge `sell-watch` lit toutes les 2 minutes les transferts
-- d'USDT entrants sur les adresses de dépôt d'Ooble (Tron, BNB Chain,
-- Polygon, Avalanche, Ethereum) et les enregistre dans `chain_deposits`.
-- match_sell_deposits() rapproche ensuite chaque dépôt d'un ordre de vente :
--   • même réseau, montant à 0,01 USDT près ;
--   • ordre créé entre 2 h avant et 12 h après le transfert (le client crée
--     l'ordre en cliquant « J'ai envoyé mes USDT », donc après l'envoi) ;
--   • une seule vente possible, sinon le dépôt attend l'équipe (« review »).
-- L'ordre passe alors à « paiement reçu » : il apparaît dans la file de
-- l'admin avec le virement Interac à faire, déjà rempli. Envoyer le virement
-- reste manuel (pas d'API d'envoi Interac chez Desjardins).
-- Un dépôt sans vente correspondante après 24 h passe à « unmatched ».
-- Solana n'est pas surveillé : ces ventes restent manuelles.
-- Appliquée en production le 2026-10-08.

create table if not exists public.chain_deposits (
  id uuid primary key default gen_random_uuid(),
  network public.usdt_network not null,
  tx_hash text not null,
  log_index int not null default 0,
  from_address text,
  to_address text not null,
  usdt_amount numeric(20, 6) not null,
  block_time timestamptz not null,
  order_id uuid references public.orders (id),
  status text not null default 'new' check (status in ('new', 'matched', 'review', 'unmatched', 'ignored')),
  reason text,
  handled_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (network, tx_hash, log_index)
);
create unique index if not exists chain_deposits_one_per_order on public.chain_deposits (order_id) where status = 'matched';
create index if not exists chain_deposits_status_idx on public.chain_deposits (status, block_time desc);

create table if not exists public.chain_scan_state (
  network public.usdt_network primary key,
  cursor bigint not null,
  updated_at timestamptz not null default now()
);

alter table public.chain_deposits enable row level security;
alter table public.chain_scan_state enable row level security;
create policy "Staff voit les dépôts USDT" on public.chain_deposits for select using (public.is_staff(auth.uid()));
create policy "Staff voit l'état de lecture" on public.chain_scan_state for select using (public.is_staff(auth.uid()));

drop trigger if exists chain_deposits_touch on public.chain_deposits;
create trigger chain_deposits_touch before update on public.chain_deposits
  for each row execute function public.touch_updated_at();

-- Rapprochement. Renvoie les ordres qui viennent de passer à « paiement reçu ».
create or replace function public.match_sell_deposits()
returns table (order_id uuid, deposit_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  d record;
  n_exact int;
  cand uuid;
  near_id uuid;
  near_amt numeric;
  prev public.order_status;
begin
  if not (coalesce(auth.role(), '') = 'service_role' or session_user <> 'authenticator'
          or public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'operator')) then
    raise exception 'Réservé à l''équipe.' using errcode = '42501';
  end if;

  for d in select * from public.chain_deposits where status = 'new' order by block_time loop
    select count(*), min(o.id::text)::uuid into n_exact, cand
      from public.orders o
     where o.side = 'sell' and o.network = d.network
       and o.status in ('created', 'awaiting_payment')
       and o.created_at between d.block_time - interval '2 hours' and d.block_time + interval '12 hours'
       and abs(o.usdt_amount - d.usdt_amount) <= 0.01
       and not exists (select 1 from public.chain_deposits x where x.order_id = o.id and x.status = 'matched');

    if n_exact = 1 then
      select o.status into prev from public.orders o where o.id = cand;
      update public.chain_deposits set status = 'matched', order_id = cand,
             reason = 'Rapproché : réseau, montant et horaire concordent.' where id = d.id;
      update public.orders set status = 'payment_received'
       where id = cand and status in ('created', 'awaiting_payment');
      insert into public.order_events (order_id, previous_status, new_status, actor, note)
      values (cand, prev, 'payment_received', 'system',
              'USDT reçus sur la blockchain : ' || public.fr_money(d.usdt_amount) || ' USDT (transaction ' || left(d.tx_hash, 12) || '…)');
      order_id := cand; deposit_id := d.id; return next;
      continue;
    end if;

    if n_exact > 1 then
      update public.chain_deposits set status = 'review',
             reason = 'Plusieurs ventes du même montant sur ce réseau : choisissez la bonne.' where id = d.id;
      continue;
    end if;

    -- Montant différent : la vente la plus proche, s'il y en a une (frais de
    -- retrait d'une plateforme d'échange, erreur de saisie…).
    select o.id, o.usdt_amount into near_id, near_amt
      from public.orders o
     where o.side = 'sell' and o.network = d.network
       and o.status in ('created', 'awaiting_payment')
       and o.created_at between d.block_time - interval '2 hours' and d.block_time + interval '12 hours'
       and abs(o.usdt_amount - d.usdt_amount) <= greatest(5, o.usdt_amount * 0.05)
       and not exists (select 1 from public.chain_deposits x where x.order_id = o.id and x.status = 'matched')
     order by abs(o.usdt_amount - d.usdt_amount) limit 1;
    if near_id is not null then
      update public.chain_deposits set status = 'review', order_id = near_id,
             reason = 'Montant reçu ' || public.fr_money(d.usdt_amount) || ' USDT au lieu de ' || public.fr_money(near_amt)
                      || ' USDT (vente OOB-' || upper(left(near_id::text, 8)) || ').' where id = d.id;
      continue;
    end if;

    if d.block_time < now() - interval '24 hours' then
      update public.chain_deposits set status = 'unmatched',
             reason = 'Aucune vente correspondante dans les 24 heures.' where id = d.id;
    end if;
  end loop;
end;
$$;
revoke execute on function public.match_sell_deposits() from public, anon;
grant execute on function public.match_sell_deposits() to authenticated;

-- Rattachement manuel d'un dépôt à une vente (admin ou opérateur).
create or replace function public.attach_chain_deposit(_deposit uuid, _order uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.chain_deposits;
  o public.orders;
begin
  if not (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'operator')) then
    raise exception 'Réservé à l''équipe.' using errcode = '42501';
  end if;
  select * into d from public.chain_deposits where id = _deposit for update;
  if d.id is null or d.status = 'matched' then raise exception 'Dépôt introuvable ou déjà rattaché.'; end if;
  select * into o from public.orders where id = _order for update;
  if o.id is null or o.side <> 'sell' or o.network <> d.network then raise exception 'Vente introuvable ou réseau différent.'; end if;
  if o.status not in ('created', 'awaiting_payment') then raise exception 'La vente est déjà « % ».', o.status; end if;
  if exists (select 1 from public.chain_deposits x where x.order_id = o.id and x.status = 'matched') then
    raise exception 'Cette vente a déjà un dépôt rattaché.';
  end if;
  update public.chain_deposits set status = 'matched', order_id = o.id, handled_by = auth.uid(),
         reason = 'Rattaché à la main par l''équipe.' where id = d.id;
  update public.orders set status = 'payment_received' where id = o.id;
  insert into public.order_events (order_id, previous_status, new_status, actor, note)
  values (o.id, o.status, 'payment_received', auth.uid()::text,
          'USDT reçus (rattachés à la main) : ' || public.fr_money(d.usdt_amount) || ' USDT (transaction ' || left(d.tx_hash, 12) || '…)');
end;
$$;
revoke execute on function public.attach_chain_deposit(uuid, uuid) from public, anon;
grant execute on function public.attach_chain_deposit(uuid, uuid) to authenticated;

-- Écarter un dépôt (test interne, remboursé…), avec le motif.
create or replace function public.ignore_chain_deposit(_deposit uuid, _reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'operator')) then
    raise exception 'Réservé à l''équipe.' using errcode = '42501';
  end if;
  update public.chain_deposits set status = 'ignored', handled_by = auth.uid(),
         reason = coalesce(nullif(trim(_reason), ''), 'Écarté par l''équipe.')
   where id = _deposit and status <> 'matched';
end;
$$;
revoke execute on function public.ignore_chain_deposit(uuid, text) from public, anon;
grant execute on function public.ignore_chain_deposit(uuid, text) to authenticated;

-- Lecture toutes les 2 minutes.
select cron.schedule('sell-watch', '*/2 * * * *', $$
  select net.http_post(
    url := 'https://uukxacjjviiktmbikdwp.supabase.co/functions/v1/sell-watch',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{"action":"scan"}'::jsonb
  );
$$);
