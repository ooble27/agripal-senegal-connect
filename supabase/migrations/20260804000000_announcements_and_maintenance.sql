-- Ooble — Bannière annonce + mode maintenance côté client (Task #34)
--
-- Deux tables :
--   * announcements       — bannières bilingues affichées en haut de toutes les
--                           pages clients (site public + app connectée)
--   * maintenance_windows — fenêtres de maintenance avec overlay bloquant, avec
--                           possibilité d'être planifiées (starts_at/ends_at)
--
-- Règle produit :
--   * une seule annonce active à la fois (contrainte partielle unique)
--   * une seule fenêtre de maintenance active à la fois (contrainte partielle
--     unique)
--
-- RLS :
--   * lecture publique (anon + authenticated) pour les enregistrements actifs
--   * lecture complète pour le staff (historique)
--   * écriture réservée à l'admin (role app_role = 'admin')

-- ===== Type d'annonce (info / avertissement / critique) =====
create type public.announcement_kind as enum ('info', 'warning', 'critical');

-- ===== Table : announcements =====
create table public.announcements (
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

-- Une seule annonce active à la fois (index partiel unique — accepte n rangs
-- inactifs, mais un seul actif).
create unique index announcements_single_active_idx
  on public.announcements ((true))
  where active;

create index announcements_created_at_idx on public.announcements (created_at desc);

-- Trigger updated_at
create trigger announcements_touch_updated_at before update on public.announcements
  for each row execute function public.touch_updated_at();

-- ===== Table : maintenance_windows =====
create table public.maintenance_windows (
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

-- Une seule fenêtre active à la fois
create unique index maintenance_windows_single_active_idx
  on public.maintenance_windows ((true))
  where active;

create index maintenance_windows_starts_at_idx on public.maintenance_windows (starts_at);
create index maintenance_windows_created_at_idx on public.maintenance_windows (created_at desc);

create trigger maintenance_windows_touch_updated_at before update on public.maintenance_windows
  for each row execute function public.touch_updated_at();

-- ===== Policies : announcements =====

-- Lecture publique de l'annonce active (anon + authenticated)
create policy "Lecture publique de l'annonce active"
  on public.announcements for select
  using (active = true);

-- Le staff voit tout l'historique
create policy "Le staff voit toutes les annonces"
  on public.announcements for select
  using (public.is_staff(auth.uid()));

-- L'admin gère (insert / update / delete)
create policy "L'admin gère les annonces"
  on public.announcements for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ===== Policies : maintenance_windows =====

create policy "Lecture publique des fenêtres de maintenance actives"
  on public.maintenance_windows for select
  using (active = true);

create policy "Le staff voit toutes les fenêtres de maintenance"
  on public.maintenance_windows for select
  using (public.is_staff(auth.uid()));

create policy "L'admin gère les fenêtres de maintenance"
  on public.maintenance_windows for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
