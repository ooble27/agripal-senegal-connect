-- Règlement automatique des achats.
--
--   1. Les avis de virement Interac reçus sur interac@ooble.ca sont lus par
--      la fonction `mail-webhook` et enregistrés dans `interac_receipts`. S'ils
--      correspondent à un ordre d'achat (référence OOB-…, montant exact, nom
--      du client), l'ordre passe à « paiement reçu ».
--   2. La fonction `usdt-payout` envoie alors les USDT depuis le portefeuille
--      chaud d'Ooble (`usdt_payouts`), automatiquement si les réglages le
--      permettent, sinon sur un clic de l'équipe.
--
-- Un seul envoi actif par ordre : l'index unique partiel empêche tout double
-- envoi, même si deux appels arrivent en même temps. Un envoi « failed »
-- (échec avant diffusion sur la blockchain) peut être relancé ; un envoi
-- « review » (issue incertaine) bloque l'ordre jusqu'à vérification humaine.

create table if not exists public.settlement_settings (
  id int primary key default 1 check (id = 1),
  -- Envoi des USDT sans intervention dès que le paiement est rapproché.
  auto_payout boolean not null default true,
  -- Au-delà de ce montant (CAD), l'envoi attend un clic de l'équipe.
  auto_payout_max_cad numeric(12, 2) not null default 50,
  -- Plafond des envois du portefeuille chaud sur 24 heures (USDT).
  daily_payout_max_usdt numeric(18, 6) not null default 500,
  -- N'envoie automatiquement que si l'avis Interac est authentifié (DKIM).
  require_email_auth boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
insert into public.settlement_settings (id) values (1) on conflict (id) do nothing;

alter table public.settlement_settings enable row level security;
drop policy if exists "Staff lit les réglages de règlement" on public.settlement_settings;
create policy "Staff lit les réglages de règlement"
  on public.settlement_settings for select
  using (public.is_staff(auth.uid()));
drop policy if exists "Admin modifie les réglages de règlement" on public.settlement_settings;
create policy "Admin modifie les réglages de règlement"
  on public.settlement_settings for update
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table if not exists public.interac_receipts (
  id uuid primary key default gen_random_uuid(),
  resend_id text unique,
  -- Numéro de référence Interac (unique : un virement = un avis).
  interac_ref text unique,
  from_email text,
  sender_name text,
  amount_cad numeric(12, 2),
  order_ref text,
  order_id uuid references public.orders (id),
  status text not null check (status in ('matched', 'unmatched', 'mismatch', 'duplicate', 'ignored')),
  reason text,
  authenticated boolean not null default false,
  subject text,
  body_text text,
  received_at timestamptz not null default now()
);
create index if not exists interac_receipts_received_idx on public.interac_receipts (received_at desc);

alter table public.interac_receipts enable row level security;
drop policy if exists "Staff lit les avis Interac" on public.interac_receipts;
create policy "Staff lit les avis Interac"
  on public.interac_receipts for select
  using (public.is_staff(auth.uid()));

create table if not exists public.usdt_payouts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id),
  network public.usdt_network not null,
  from_address text,
  to_address text not null,
  usdt_amount numeric(18, 6) not null check (usdt_amount > 0),
  status text not null check (status in ('sending', 'broadcast', 'confirmed', 'failed', 'review')),
  tx_hash text,
  error text,
  trigger text not null check (trigger in ('auto', 'staff')),
  requested_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists usdt_payouts_one_active
  on public.usdt_payouts (order_id) where status <> 'failed';
create index if not exists usdt_payouts_created_idx on public.usdt_payouts (created_at desc);

alter table public.usdt_payouts enable row level security;
drop policy if exists "Staff lit les envois USDT" on public.usdt_payouts;
create policy "Staff lit les envois USDT"
  on public.usdt_payouts for select
  using (public.is_staff(auth.uid()));

-- Réglages, avis et envois sont écrits par les fonctions edge (service_role).

-- Vérifie toutes les 2 minutes les envois en cours sur la blockchain.
select cron.schedule('reconcile-usdt-payouts', '*/2 * * * *', $$
  select net.http_post(
    url := 'https://uukxacjjviiktmbikdwp.supabase.co/functions/v1/usdt-payout',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{"action":"reconcile"}'::jsonb
  );
$$);
