-- ────────────────────────────────────────────────────────────────────
-- OOBLE — Migrations en attente
--
-- Objet : appliquer manuellement les 3 migrations créées récemment
-- (audit log, bannières/maintenance, trésorerie) sur la base Supabase de
-- production sans passer par la CLI `supabase db push`.
--
-- Comment utiliser :
--   1. Ouvrir Supabase Studio → onglet « SQL Editor »
--   2. Créer une nouvelle requête, coller **tout** ce fichier
--   3. Cliquer « Run »
--
-- Le script est écrit pour être ré-exécutable sans casse :
--   - `if not exists` sur les CREATE
--   - `on conflict do nothing` sur les INSERT de seed
--   - Les `create policy` déclencheront une erreur si vous relancez —
--     dans ce cas les policies existent déjà, aucune action requise.
--
-- Après exécution, Studio → Table Editor doit montrer :
--   admin_audit_log · announcements · maintenance_windows ·
--   treasury_addresses · treasury_balance_snapshots · treasury_movements ·
--   treasury_alert_config
-- ────────────────────────────────────────────────────────────────────


-- ════════════════════════════════════════════════════════════════════
-- Migration 1 / 3 — Journal d'audit immuable
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.admin_audit_log (
  id             uuid primary key default gen_random_uuid(),
  actor_user_id  uuid references auth.users (id) on delete set null,
  actor_role     text,
  actor_email    text,
  action         text not null,
  entity_kind    text,
  entity_id      uuid,
  before         jsonb,
  after          jsonb,
  metadata       jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_actor_idx      on public.admin_audit_log (actor_user_id);
create index if not exists admin_audit_log_action_idx     on public.admin_audit_log (action);
create index if not exists admin_audit_log_entity_idx     on public.admin_audit_log (entity_kind, entity_id);

alter table public.admin_audit_log enable row level security;

create policy "Le staff journalise ses actions"
  on public.admin_audit_log for insert
  with check (
    public.is_staff(auth.uid())
    and (actor_user_id is null or actor_user_id = auth.uid())
  );

create policy "Conformité et admin lisent le journal d'audit"
  on public.admin_audit_log for select
  using (public.has_role(auth.uid(), 'admin'));

create policy "Journal d'audit immuable — aucun UPDATE"
  on public.admin_audit_log for update
  using (false) with check (false);

create policy "Journal d'audit immuable — aucune SUPPRESSION"
  on public.admin_audit_log for delete
  using (false);


-- ════════════════════════════════════════════════════════════════════
-- Migration 2 / 3 — Bannières + fenêtres de maintenance
-- ════════════════════════════════════════════════════════════════════

do $$ begin
  create type public.announcement_kind as enum ('info', 'warning', 'critical');
exception when duplicate_object then null; end $$;

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  kind public.announcement_kind not null default 'info',
  title_fr text not null,
  title_en text not null,
  body_fr text not null default '',
  body_en text not null default '',
  active boolean not null default false,
  dismissible boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.announcements enable row level security;

create unique index if not exists announcements_single_active_idx
  on public.announcements ((true)) where active;
create index if not exists announcements_created_at_idx on public.announcements (created_at desc);

drop trigger if exists announcements_touch_updated_at on public.announcements;
create trigger announcements_touch_updated_at before update on public.announcements
  for each row execute function public.touch_updated_at();

create table if not exists public.maintenance_windows (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz,
  ends_at timestamptz,
  title_fr text not null,
  title_en text not null,
  body_fr text not null default '',
  body_en text not null default '',
  active boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.maintenance_windows enable row level security;

create unique index if not exists maintenance_windows_single_active_idx
  on public.maintenance_windows ((true)) where active;
create index if not exists maintenance_windows_starts_at_idx on public.maintenance_windows (starts_at);
create index if not exists maintenance_windows_created_at_idx on public.maintenance_windows (created_at desc);

drop trigger if exists maintenance_windows_touch_updated_at on public.maintenance_windows;
create trigger maintenance_windows_touch_updated_at before update on public.maintenance_windows
  for each row execute function public.touch_updated_at();

create policy "Lecture publique de l'annonce active"
  on public.announcements for select using (active = true);

create policy "Le staff voit toutes les annonces"
  on public.announcements for select using (public.is_staff(auth.uid()));

create policy "L'admin gère les annonces"
  on public.announcements for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Lecture publique des fenêtres de maintenance actives"
  on public.maintenance_windows for select using (active = true);

create policy "Le staff voit toutes les fenêtres de maintenance"
  on public.maintenance_windows for select using (public.is_staff(auth.uid()));

create policy "L'admin gère les fenêtres de maintenance"
  on public.maintenance_windows for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));


-- ════════════════════════════════════════════════════════════════════
-- Migration 3 / 3 — Trésorerie USDT multi-réseaux
-- ════════════════════════════════════════════════════════════════════

do $$ begin
  create type public.treasury_address_purpose as enum
    ('deposit', 'hot', 'cold', 'settlement');
exception when duplicate_object then null; end $$;

create table if not exists public.treasury_addresses (
  id uuid primary key default gen_random_uuid(),
  network public.usdt_network not null,
  label text not null,
  address text not null,
  purpose public.treasury_address_purpose not null default 'deposit',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (network, address)
);

create index if not exists treasury_addresses_network_idx on public.treasury_addresses (network);
create index if not exists treasury_addresses_active_idx on public.treasury_addresses (active);

alter table public.treasury_addresses enable row level security;

create policy "Seul l'admin gère les adresses de trésorerie"
  on public.treasury_addresses for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table if not exists public.treasury_balance_snapshots (
  id uuid primary key default gen_random_uuid(),
  address_id uuid not null references public.treasury_addresses (id) on delete cascade,
  balance_usdt numeric(20, 6) not null check (balance_usdt >= 0),
  recorded_at timestamptz not null default now(),
  source text not null default 'manual',
  recorded_by uuid references auth.users (id)
);

create index if not exists treasury_snapshots_address_recorded_idx
  on public.treasury_balance_snapshots (address_id, recorded_at desc);

alter table public.treasury_balance_snapshots enable row level security;

create policy "Seul l'admin gère les snapshots de trésorerie"
  on public.treasury_balance_snapshots for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table if not exists public.treasury_movements (
  id uuid primary key default gen_random_uuid(),
  from_address_id uuid references public.treasury_addresses (id) on delete restrict,
  to_address_id uuid references public.treasury_addresses (id) on delete restrict,
  amount_usdt numeric(20, 6) not null check (amount_usdt > 0),
  tx_hash text,
  reason text not null default 'other',
  recorded_by uuid references auth.users (id),
  notes text,
  created_at timestamptz not null default now(),
  constraint treasury_movement_endpoints_check
    check (from_address_id is not null or to_address_id is not null)
);

create index if not exists treasury_movements_created_at_idx on public.treasury_movements (created_at desc);
create index if not exists treasury_movements_from_idx on public.treasury_movements (from_address_id);
create index if not exists treasury_movements_to_idx on public.treasury_movements (to_address_id);

alter table public.treasury_movements enable row level security;

create policy "Seul l'admin gère les mouvements de trésorerie"
  on public.treasury_movements for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create table if not exists public.treasury_alert_config (
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

drop trigger if exists treasury_alert_config_touch_updated_at on public.treasury_alert_config;
create trigger treasury_alert_config_touch_updated_at
  before update on public.treasury_alert_config
  for each row execute function public.touch_updated_at();

insert into public.treasury_alert_config (network, low_balance_threshold_usdt, alert_enabled)
values
  ('trc20',     2000, true),
  ('erc20',     1000, true),
  ('bep20',     1000, true),
  ('polygon',   1000, true),
  ('spl',       1000, true),
  ('avalanche', 1000, true)
on conflict (network) do nothing;


-- ════════════════════════════════════════════════════════════════════
-- Fin — vérification rapide
-- ════════════════════════════════════════════════════════════════════

-- La commande suivante liste les 7 nouvelles tables. Décommentez pour vérifier.
-- select table_name from information_schema.tables
-- where table_schema = 'public'
--   and table_name in (
--     'admin_audit_log', 'announcements', 'maintenance_windows',
--     'treasury_addresses', 'treasury_balance_snapshots',
--     'treasury_movements', 'treasury_alert_config'
--   )
-- order by table_name;
