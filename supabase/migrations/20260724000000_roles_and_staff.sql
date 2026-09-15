-- Ooble — rôles du back-office, policies staff, prise en charge des ordres,
-- et réseaux USDT supplémentaires. Complète le schéma initial sans le casser.

-- ===== Réseaux USDT supplémentaires =====
-- (Le schéma initial ne connaissait que trc20 / erc20.)
alter type public.usdt_network add value if not exists 'bep20';
alter type public.usdt_network add value if not exists 'polygon';
alter type public.usdt_network add value if not exists 'spl';
alter type public.usdt_network add value if not exists 'avalanche';

-- ===== Rôles d'équipe (back-office) =====
create type public.app_role as enum ('admin', 'operator', 'kyc_reviewer', 'support', 'marketing');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Fonctions SECURITY DEFINER : indispensables pour tester un rôle DANS une
-- policy sans provoquer de récursion RLS (règle Supabase).
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  );
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id);
$$;

create policy "Chacun voit ses rôles ; l'admin voit tout"
  on public.user_roles for select
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create policy "Seul l'admin gère les rôles"
  on public.user_roles for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ===== Prise en charge des ordres (file d'attente / verrouillage équipe) =====
alter table public.orders add column assigned_to uuid references auth.users (id);
alter table public.orders add column assigned_at timestamptz;
create index orders_assigned_to_idx on public.orders (assigned_to);

-- ===== Policies staff — back-office =====

-- Ordres : le staff voit tout ; admin/opérateur mettent à jour.
create policy "Le staff voit tous les ordres"
  on public.orders for select
  using (public.is_staff(auth.uid()));

create policy "Admin/opérateur mettent à jour les ordres"
  on public.orders for update
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'operator'));

-- Événements d'ordre : lecture staff.
create policy "Le staff voit tous les événements d'ordre"
  on public.order_events for select
  using (public.is_staff(auth.uid()));

-- Profils clients : lecture staff (fiche client dans le back-office).
create policy "Le staff voit tous les profils"
  on public.profiles for select
  using (public.is_staff(auth.uid()));

-- KYC : les réviseurs KYC et les admins voient et mettent à jour.
create policy "Le staff KYC voit toutes les vérifications"
  on public.kyc_verifications for select
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'kyc_reviewer'));

create policy "Le staff KYC met à jour les vérifications"
  on public.kyc_verifications for update
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'kyc_reviewer'));

-- Paiements & transactions blockchain : lecture staff.
create policy "Le staff voit les paiements"
  on public.payment_confirmations for select
  using (public.is_staff(auth.uid()));

create policy "Le staff voit les transactions blockchain"
  on public.blockchain_transactions for select
  using (public.is_staff(auth.uid()));

-- Conformité (FINTRAC) : réservé aux admins.
create policy "L'admin gère les signalements de conformité"
  on public.compliance_flags for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ===== updated_at automatique =====
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger orders_touch_updated_at before update on public.orders
  for each row execute function public.touch_updated_at();
create trigger kyc_touch_updated_at before update on public.kyc_verifications
  for each row execute function public.touch_updated_at();
