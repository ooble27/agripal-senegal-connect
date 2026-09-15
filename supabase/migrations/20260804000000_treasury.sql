-- Ooble — Trésorerie USDT multi-réseaux.
-- Inventaire des adresses de dépôt/hot/cold/règlement, snapshots de solde
-- (manuels pour l'instant), mouvements internes (rebalancing/liquidation)
-- et configuration d'alerte solde bas par réseau.
--
-- Toutes les tables sont réservées au back-office (RLS admin uniquement).

-- ===== Types =====

create type public.treasury_address_purpose as enum (
  'deposit',    -- adresse de dépôt client (achat)
  'hot',        -- portefeuille chaud pour opérations quotidiennes
  'cold',       -- stockage à froid
  'settlement'  -- règlement fournisseurs / OTC
);

-- ===== Adresses de trésorerie =====

create table public.treasury_addresses (
  id uuid primary key default gen_random_uuid(),
  network public.usdt_network not null,
  label text not null,
  address text not null,
  purpose public.treasury_address_purpose not null default 'deposit',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  -- Une même adresse ne peut apparaître qu'une fois par réseau.
  unique (network, address)
);

create index treasury_addresses_network_idx on public.treasury_addresses (network);
create index treasury_addresses_active_idx on public.treasury_addresses (active);

alter table public.treasury_addresses enable row level security;

create policy "Seul l'admin gère les adresses de trésorerie"
  on public.treasury_addresses for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ===== Snapshots de solde =====
-- Manuel pour l'instant ; source = 'onchain_api' quand l'automatisation
-- (TronScan, Etherscan, etc.) sera branchée dans une prochaine itération.

create table public.treasury_balance_snapshots (
  id uuid primary key default gen_random_uuid(),
  address_id uuid not null references public.treasury_addresses (id) on delete cascade,
  balance_usdt numeric(20, 6) not null check (balance_usdt >= 0),
  recorded_at timestamptz not null default now(),
  source text not null default 'manual',
  recorded_by uuid references auth.users (id)
);

create index treasury_snapshots_address_recorded_idx
  on public.treasury_balance_snapshots (address_id, recorded_at desc);

alter table public.treasury_balance_snapshots enable row level security;

create policy "Seul l'admin gère les snapshots de trésorerie"
  on public.treasury_balance_snapshots for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ===== Mouvements de trésorerie =====
-- Un mouvement peut être :
--   - Interne (from + to)      : rebalancing entre nos adresses
--   - Sortie (from + no to)    : liquidation / envoi externe
--   - Entrée (no from + to)    : topup depuis l'extérieur

create table public.treasury_movements (
  id uuid primary key default gen_random_uuid(),
  from_address_id uuid references public.treasury_addresses (id) on delete restrict,
  to_address_id uuid references public.treasury_addresses (id) on delete restrict,
  amount_usdt numeric(20, 6) not null check (amount_usdt > 0),
  tx_hash text,
  reason text not null default 'other',
  recorded_by uuid references auth.users (id),
  notes text,
  created_at timestamptz not null default now(),
  -- Au moins une extrémité doit être renseignée.
  constraint treasury_movement_endpoints_check
    check (from_address_id is not null or to_address_id is not null)
);

create index treasury_movements_created_at_idx
  on public.treasury_movements (created_at desc);
create index treasury_movements_from_idx on public.treasury_movements (from_address_id);
create index treasury_movements_to_idx on public.treasury_movements (to_address_id);

alter table public.treasury_movements enable row level security;

create policy "Seul l'admin gère les mouvements de trésorerie"
  on public.treasury_movements for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ===== Configuration des alertes =====
-- Une ligne par réseau, seed pour les 6 réseaux supportés.

create table public.treasury_alert_config (
  network public.usdt_network primary key,
  low_balance_threshold_usdt numeric(20, 6) not null default 1000 check (low_balance_threshold_usdt >= 0),
  alert_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.treasury_alert_config enable row level security;

create policy "Seul l'admin gère la configuration des alertes de trésorerie"
  on public.treasury_alert_config for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create trigger treasury_alert_config_touch_updated_at
  before update on public.treasury_alert_config
  for each row execute function public.touch_updated_at();

-- Seed : une configuration par défaut pour chaque réseau supporté.
insert into public.treasury_alert_config (network, low_balance_threshold_usdt, alert_enabled)
values
  ('trc20',     2000, true),
  ('erc20',     1000, true),
  ('bep20',     1000, true),
  ('polygon',   1000, true),
  ('spl',       1000, true),
  ('avalanche', 1000, true)
on conflict (network) do nothing;
