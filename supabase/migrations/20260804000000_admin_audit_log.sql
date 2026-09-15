-- Journal d'audit immuable des actions administratives (Feature #31).
--
-- Chaque action pertinente du back-office (changement de statut de commande,
-- décision KYC, changement de rôle, action de conformité, etc.) écrit ici une
-- ligne append-only. La table est en écriture seule : les policies UPDATE et
-- DELETE refusent *toujours*, même à un admin. Les corrections se font par
-- ajout d'une nouvelle ligne, jamais par modification / suppression.
--
-- Lecture : agents de conformité et admins uniquement.
-- Écriture : toute personne du staff (via `is_staff`).

create table public.admin_audit_log (
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

comment on table  public.admin_audit_log is 'Journal append-only : toute action admin y est tracée. Aucun UPDATE ni DELETE autorisé.';
comment on column public.admin_audit_log.action      is 'Identifiant court (ex : order.status_change, kyc.approve, team.role_change).';
comment on column public.admin_audit_log.entity_kind is 'Nature de l''entité affectée : order / client / compliance_case / kyc / team_member / …';
comment on column public.admin_audit_log.before      is 'Snapshot JSON de l''état AVANT l''action (peut être null pour une création).';
comment on column public.admin_audit_log.after       is 'Snapshot JSON de l''état APRÈS l''action (peut être null pour une suppression).';
comment on column public.admin_audit_log.metadata    is 'Contexte libre : IP, user agent, notes, raison, référence, etc.';

-- Index d'accès classiques pour la vue de recherche.
create index admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);
create index admin_audit_log_actor_idx      on public.admin_audit_log (actor_user_id);
create index admin_audit_log_action_idx     on public.admin_audit_log (action);
create index admin_audit_log_entity_idx     on public.admin_audit_log (entity_kind, entity_id);

alter table public.admin_audit_log enable row level security;

-- ─── Écriture ────────────────────────────────────────────────
-- Tout membre du staff peut insérer une ligne (auto-attestation) ; on garantit
-- juste que actor_user_id correspond bien à l'utilisateur connecté pour éviter
-- l'usurpation d'identité par un autre membre.
create policy "Le staff journalise ses actions"
  on public.admin_audit_log for insert
  with check (
    public.is_staff(auth.uid())
    and (actor_user_id is null or actor_user_id = auth.uid())
  );

-- ─── Lecture ─────────────────────────────────────────────────
-- Agent de conformité et directeurs (admin) uniquement.
create policy "Conformité et admin lisent le journal d'audit"
  on public.admin_audit_log for select
  using (public.has_role(auth.uid(), 'admin'));

-- ─── Immuabilité — aucune modification, aucune suppression ───
-- Policies « refus systématique » : `using` retourne false, donc aucune ligne
-- n'est jamais visible pour un UPDATE / DELETE. Défense en profondeur en plus
-- de l'absence de policy permissive.
create policy "Journal d'audit immuable — aucun UPDATE"
  on public.admin_audit_log for update
  using (false)
  with check (false);

create policy "Journal d'audit immuable — aucune SUPPRESSION"
  on public.admin_audit_log for delete
  using (false);
