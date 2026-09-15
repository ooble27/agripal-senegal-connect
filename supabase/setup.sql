-- Ooble — installation complète en un seul script.
-- À coller dans Supabase → SQL Editor → Run. Ré-exécutable : nettoie d'abord
-- (base sans données), puis (re)crée tout. Miroir des migrations.

-- ===================== Remise à zéro (idempotent) =====================
drop table if exists public.compliance_flags cascade;
drop table if exists public.blockchain_transactions cascade;
drop table if exists public.payment_confirmations cascade;
drop table if exists public.order_events cascade;
drop table if exists public.orders cascade;
drop table if exists public.kyc_verifications cascade;
drop table if exists public.user_roles cascade;
drop table if exists public.exchange_rates cascade;
drop table if exists public.profiles cascade;
drop function if exists public.handle_new_user cascade;
drop function if exists public.has_role cascade;
drop function if exists public.is_staff cascade;
drop function if exists public.touch_updated_at cascade;
drop type if exists public.order_side cascade;
drop type if exists public.order_status cascade;
drop type if exists public.usdt_network cascade;
drop type if exists public.kyc_status cascade;
drop type if exists public.app_role cascade;

-- ===================== Types =====================
create type public.order_side as enum ('buy', 'sell');

create type public.order_status as enum (
  'created', 'awaiting_payment', 'payment_received',
  'settling', 'completed', 'cancelled', 'expired'
);

create type public.usdt_network as enum
  ('trc20', 'bep20', 'erc20', 'polygon', 'spl', 'avalanche');

create type public.kyc_status as enum ('not_started', 'pending', 'approved', 'rejected');

create type public.app_role as enum ('admin', 'operator', 'kyc_reviewer', 'support', 'marketing');

-- ===================== Profils =====================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  phone text,
  kyc_status public.kyc_status not null default 'not_started',
  daily_limit_cad numeric(12, 2) not null default 3000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.email);
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();
-- Trigger interne : jamais appelable directement par les clients.
revoke execute on function public.handle_new_user() from anon, authenticated;

-- ===================== Rôles d'équipe =====================
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;
create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id);
$$;

-- ===================== KYC =====================
create table public.kyc_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider text not null default 'manual',
  external_reference text,
  status public.kyc_status not null default 'pending',
  result_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.kyc_verifications enable row level security;

-- ===================== Ordres =====================
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  side public.order_side not null,
  cad_amount numeric(12, 2) not null check (cad_amount > 0),
  usdt_amount numeric(18, 6) not null check (usdt_amount > 0),
  locked_rate numeric(12, 6) not null check (locked_rate > 0),
  fee_cad numeric(12, 2) not null default 0 check (fee_cad >= 0),
  network public.usdt_network not null default 'trc20',
  wallet_address text not null,
  interac_email text,
  status public.order_status not null default 'created',
  assigned_to uuid references auth.users (id),
  assigned_at timestamptz,
  rate_locked_until timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sell_requires_interac check (side = 'buy' or interac_email is not null)
);
create index orders_user_id_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status)
  where status not in ('completed', 'cancelled', 'expired');
create index orders_assigned_to_idx on public.orders (assigned_to);
alter table public.orders enable row level security;

-- ===================== Journal d'audit =====================
create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  previous_status public.order_status,
  new_status public.order_status not null,
  actor text not null,
  note text,
  created_at timestamptz not null default now()
);
create index order_events_order_id_idx on public.order_events (order_id, created_at);
alter table public.order_events enable row level security;

-- ===================== Paiements CAD =====================
create table public.payment_confirmations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id),
  direction text not null check (direction in ('inbound', 'outbound')),
  method text not null default 'interac_etransfer',
  reference text,
  amount_cad numeric(12, 2) not null check (amount_cad > 0),
  confirmed_by text,
  confirmed_at timestamptz not null default now()
);
alter table public.payment_confirmations enable row level security;

-- ===================== Transactions blockchain =====================
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

-- ===================== Taux =====================
create table public.exchange_rates (
  id bigint generated always as identity primary key,
  source text not null,
  buy_rate numeric(12, 6) not null,
  sell_rate numeric(12, 6) not null,
  fetched_at timestamptz not null default now()
);
alter table public.exchange_rates enable row level security;

-- ===================== Conformité =====================
create table public.compliance_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id),
  order_id uuid references public.orders (id),
  flag_type text not null,
  details jsonb,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.compliance_flags enable row level security;

-- ===================== updated_at automatique =====================
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();
create trigger kyc_touch before update on public.kyc_verifications
  for each row execute function public.touch_updated_at();

-- ===================== Policies (RLS) =====================
-- Profils
create policy "Voir son profil" on public.profiles for select using (auth.uid() = id);
create policy "Modifier son profil" on public.profiles for update using (auth.uid() = id);
create policy "Le staff voit tous les profils" on public.profiles for select using (public.is_staff(auth.uid()));

-- Rôles
create policy "Voir ses rôles ; l'admin voit tout" on public.user_roles for select
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "Seul l'admin gère les rôles" on public.user_roles for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- KYC
create policy "Voir ses vérifications KYC" on public.kyc_verifications for select using (auth.uid() = user_id);
create policy "Le staff KYC voit tout" on public.kyc_verifications for select
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'kyc_reviewer'));
create policy "Le staff KYC met à jour" on public.kyc_verifications for update
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'kyc_reviewer'));

-- Ordres
create policy "Voir ses ordres" on public.orders for select using (auth.uid() = user_id);
create policy "Créer ses ordres" on public.orders for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Le staff voit tous les ordres" on public.orders for select using (public.is_staff(auth.uid()));
create policy "Admin/opérateur mettent à jour les ordres" on public.orders for update
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'operator'));

-- Événements
create policy "Voir les événements de ses ordres" on public.order_events for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "Le staff voit tous les événements" on public.order_events for select using (public.is_staff(auth.uid()));
create policy "Admin/opérateur journalisent" on public.order_events for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'operator'));

-- Paiements
create policy "Voir les paiements de ses ordres" on public.payment_confirmations for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "Le staff voit les paiements" on public.payment_confirmations for select using (public.is_staff(auth.uid()));

-- Transactions
create policy "Voir les transactions de ses ordres" on public.blockchain_transactions for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "Le staff voit les transactions" on public.blockchain_transactions for select using (public.is_staff(auth.uid()));

-- Taux (public en lecture)
create policy "Taux publics en lecture" on public.exchange_rates for select using (true);

-- Conformité (admin uniquement)
create policy "L'admin gère la conformité" on public.compliance_flags for all
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
