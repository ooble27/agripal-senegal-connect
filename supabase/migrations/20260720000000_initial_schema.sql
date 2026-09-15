-- Ooble — schéma initial.
-- Modèle non-custodial, ordre par ordre : aucun solde client sur la plateforme.

-- ===== Types =====

create type public.order_side as enum ('buy', 'sell');

create type public.order_status as enum (
  'created',
  'awaiting_payment',
  'payment_received',
  'settling',
  'completed',
  'cancelled',
  'expired'
);

create type public.usdt_network as enum ('trc20', 'erc20');

create type public.kyc_status as enum ('not_started', 'pending', 'approved', 'rejected');

-- ===== Profils =====

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  kyc_status public.kyc_status not null default 'not_started',
  -- Limites (CAD) applicables tant que des paliers plus fins n'existent pas.
  daily_limit_cad numeric(12, 2) not null default 3000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Les utilisateurs voient leur propre profil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Les utilisateurs modifient leur propre profil"
  on public.profiles for update
  using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== KYC =====

create table public.kyc_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null,
  external_reference text,
  status public.kyc_status not null default 'pending',
  result_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.kyc_verifications enable row level security;

create policy "Les utilisateurs voient leurs vérifications KYC"
  on public.kyc_verifications for select
  using (auth.uid() = user_id);

-- ===== Ordres =====

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  side public.order_side not null,
  cad_amount numeric(12, 2) not null check (cad_amount > 0),
  usdt_amount numeric(18, 6) not null check (usdt_amount > 0),
  -- Taux CAD par USDT, verrouillé à la création.
  locked_rate numeric(12, 6) not null check (locked_rate > 0),
  fee_cad numeric(12, 2) not null default 0 check (fee_cad >= 0),
  network public.usdt_network not null default 'trc20',
  -- Achat : adresse du client (destination des USDT).
  -- Vente : adresse de dépôt Ooble (générée pour l'ordre).
  wallet_address text not null,
  -- Vente : courriel Interac du client pour le e-Transfer sortant.
  interac_email text,
  status public.order_status not null default 'created',
  rate_locked_until timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sell_requires_interac check (side = 'buy' or interac_email is not null)
);

create index orders_user_id_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status) where status not in ('completed', 'cancelled', 'expired');

alter table public.orders enable row level security;

create policy "Les utilisateurs voient leurs ordres"
  on public.orders for select
  using (auth.uid() = user_id);

-- Création/transition d'état exclusivement via Edge Functions (rôle service) :
-- pas de policy insert/update pour le rôle authenticated.

-- ===== Journal d'audit des ordres =====

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  previous_status public.order_status,
  new_status public.order_status not null,
  actor text not null, -- 'user' | 'admin' | 'system'
  note text,
  created_at timestamptz not null default now()
);

create index order_events_order_id_idx on public.order_events (order_id, created_at);

alter table public.order_events enable row level security;

create policy "Les utilisateurs voient les événements de leurs ordres"
  on public.order_events for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

-- ===== Confirmations de paiement CAD =====

create table public.payment_confirmations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id),
  direction text not null check (direction in ('inbound', 'outbound')),
  method text not null default 'interac_etransfer',
  reference text,
  amount_cad numeric(12, 2) not null check (amount_cad > 0),
  confirmed_by text, -- admin user id ou 'webhook'
  confirmed_at timestamptz not null default now()
);

alter table public.payment_confirmations enable row level security;

create policy "Les utilisateurs voient les paiements de leurs ordres"
  on public.payment_confirmations for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

-- ===== Transactions blockchain =====

create table public.blockchain_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id),
  direction text not null check (direction in ('inbound', 'outbound')),
  network public.usdt_network not null,
  tx_hash text not null,
  usdt_amount numeric(18, 6) not null check (usdt_amount > 0),
  confirmations integer not null default 0,
  confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (network, tx_hash)
);

alter table public.blockchain_transactions enable row level security;

create policy "Les utilisateurs voient les transactions de leurs ordres"
  on public.blockchain_transactions for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

-- ===== Taux de change =====

create table public.exchange_rates (
  id bigint generated always as identity primary key,
  source text not null,
  -- Taux CAD par USDT côté achat et côté vente (marge incluse).
  buy_rate numeric(12, 6) not null,
  sell_rate numeric(12, 6) not null,
  fetched_at timestamptz not null default now()
);

alter table public.exchange_rates enable row level security;

create policy "Les taux sont publics en lecture"
  on public.exchange_rates for select
  using (true);

-- ===== Signalements de conformité (FINTRAC) =====

create table public.compliance_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id),
  order_id uuid references public.orders (id),
  flag_type text not null, -- 'large_transaction' | 'suspicious_activity' | 'travel_rule' | ...
  details jsonb,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.compliance_flags enable row level security;
-- Aucune policy pour authenticated : accessible uniquement au rôle service/admin.
