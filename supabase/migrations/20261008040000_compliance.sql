-- Conformité CANAFE : alertes, déclarations, programme et registre réels.
--
-- Remplace les données de démonstration de l'onglet Conformité du back-office.
--
-- • compliance_alerts : alertes créées automatiquement par compliance_scan()
--   (toutes les 10 min) ou à la main par l'équipe. dedupe_key empêche qu'une
--   même situation crée deux alertes.
-- • compliance_declarations : DOIMV, DOT et DBT préparées ici puis soumises sur
--   le portail du CANAFE (la référence CANAFE est saisie au retour).
-- • compliance_checklist : programme de conformité (cases cochées, par qui,
--   quand, avec quelle preuve).
-- • compliance_register(kind, from, to) : extraction du registre (opérations,
--   identités, reçus Interac, envois USDT, déclarations) pour l'export CSV.
-- • Garde : une commande payée ne peut plus être supprimée (conservation
--   5 ans, LRPCFAT).
--
-- Règles appliquées (vérifiées sur fintrac-canafe.canada.ca le 2026-10-08) :
--   DOIMV : réception de monnaie virtuelle ≥ 10 000 $ en une opération, ou
--     plusieurs réceptions d'une même personne totalisant ≥ 10 000 $ en
--     24 heures consécutives. À soumettre dans les 5 jours ouvrables suivant
--     la réception. Chez Ooble, la réception de monnaie virtuelle = la vente
--     (le client nous envoie ses USDT).
--   DOT : dès que possible après avoir établi des motifs raisonnables de
--     soupçonner. Les alertes « soupçon » ci-dessous sont des signaux à
--     examiner, pas des déclarations automatiques.
--   DBT : immédiatement.
--   Conservation des documents : 5 ans.
-- Accès : administrateurs uniquement (onglet Conformité). Appliquée en
-- production le 2026-10-08.

-- ─────────────── Alertes ───────────────

create sequence if not exists public.compliance_alert_seq;

create table if not exists public.compliance_alerts (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('CA-' || lpad(nextval('public.compliance_alert_seq')::text, 4, '0')),
  type text not null check (type in ('doimv', 'doimv_24h', 'dot', 'voyage', 'ppv', 'sanctions')),
  source text not null default 'auto' check (source in ('auto', 'manuel')),
  dedupe_key text unique,
  order_id uuid references public.orders (id),
  order_ids uuid[] not null default '{}',
  user_id uuid references public.profiles (id),
  amount_cad numeric(14, 2) not null default 0,
  reason text not null,
  occurred_at timestamptz not null default now(),
  due_date date,
  status text not null default 'nouveau' check (status in ('nouveau', 'en_cours', 'declare', 'classe')),
  assigned_to uuid references auth.users (id),
  notes text,
  classification text,
  closed_by uuid references auth.users (id),
  closed_at timestamptz,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists compliance_alerts_status_idx on public.compliance_alerts (status, created_at desc);
create index if not exists compliance_alerts_user_idx on public.compliance_alerts (user_id);

-- ─────────────── Déclarations ───────────────

create sequence if not exists public.compliance_declaration_seq;

create table if not exists public.compliance_declarations (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('DC-' || to_char(now() at time zone 'America/Toronto', 'YYYY') || '-' || lpad(nextval('public.compliance_declaration_seq')::text, 3, '0')),
  type text not null check (type in ('doimv', 'dot', 'dbt')),
  alert_id uuid references public.compliance_alerts (id),
  user_id uuid references public.profiles (id),
  client_name text not null default '',
  amount_cad numeric(14, 2) not null default 0,
  form_data jsonb not null default '{}'::jsonb,
  status text not null default 'brouillon' check (status in ('brouillon', 'soumise', 'acceptee', 'rejetee')),
  due_date date,
  submitted_at timestamptz,
  canafe_ref text,
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists compliance_declarations_status_idx on public.compliance_declarations (status, created_at desc);

-- ─────────────── Programme ───────────────

create table if not exists public.compliance_checklist (
  id text primary key,
  position int not null,
  category text not null,
  label text not null,
  description text not null,
  frequency text,
  due_date date,
  done boolean not null default false,
  done_at timestamptz,
  done_by uuid references auth.users (id),
  evidence text,
  updated_at timestamptz not null default now()
);

insert into public.compliance_checklist (id, position, category, label, description, frequency, due_date, done, done_at, evidence) values
  ('P01', 1,  'Inscription CANAFE',       'Inscription comme ESM', 'Inscription ou renouvellement auprès du CANAFE en tant qu''entreprise de services monétaires opérant en monnaie virtuelle.', 'Tous les 2 ans', '2028-10-06', true, '2026-10-06', 'Inscription approuvée le 2026-10-06 — dossier n° 009450.'),
  ('P02', 2,  'Inscription CANAFE',       'Déclaration de changements', 'Signaler tout changement important (adresse, dirigeants, services offerts) dans les 30 jours.', 'Au besoin', null, false, null, null),
  ('P03', 3,  'Agent de conformité',      'Nomination de l''agent', 'Désigner nommément un agent de conformité responsable de la mise en oeuvre du programme.', null, null, false, null, null),
  ('P04', 4,  'Agent de conformité',      'Mandat et pouvoirs documentés', 'Documenter le mandat, les pouvoirs et les responsabilités de l''agent de conformité.', null, null, false, null, null),
  ('P05', 5,  'Politiques et procédures', 'Programme de conformité écrit', 'Rédiger et maintenir un programme de conformité complet couvrant toutes les obligations LRPCFAT.', null, null, false, null, null),
  ('P06', 6,  'Politiques et procédures', 'Procédure KYC', 'Procédure de vérification de l''identité des clients (pièce d''identité, biométrie, tiers autorisés).', null, null, false, null, null),
  ('P07', 7,  'Politiques et procédures', 'Procédure de tenue de dossiers', 'Procédure de conservation des documents et relevés pendant 5 ans.', null, null, false, null, null),
  ('P08', 8,  'Politiques et procédures', 'Procédure de déclaration', 'Procédure de préparation et soumission des DOIMV, DOT et DBT au CANAFE.', null, null, false, null, null),
  ('P09', 9,  'Politiques et procédures', 'Procédure de filtrage des sanctions', 'Procédure de vérification des clients contre les listes de sanctions du Canada.', null, null, false, null, null),
  ('P10', 10, 'Politiques et procédures', 'Procédure PPV / DOI', 'Procédure de détermination des personnes politiquement vulnérables et dirigeants d''organisations internationales.', null, null, false, null, null),
  ('P11', 11, 'Politiques et procédures', 'Procédure règle de voyage', 'Procédure de transmission des informations de l''expéditeur et du destinataire pour les transferts ≥ 1 000 $ CA.', null, null, false, null, null),
  ('P12', 12, 'Évaluation des risques',   'Évaluation initiale des risques', 'Effectuer une évaluation des risques de BA/FT propres à vos activités, clientèle et zones géographiques.', null, null, false, null, null),
  ('P13', 13, 'Évaluation des risques',   'Mise à jour de l''évaluation', 'Réviser l''évaluation des risques au moins une fois par an ou lors de changements significatifs.', 'Annuel', null, false, null, null),
  ('P14', 14, 'Formation du personnel',   'Formation initiale', 'Former tout le personnel sur les obligations LRPCFAT, la détection d''opérations douteuses et les procédures internes.', null, null, false, null, null),
  ('P15', 15, 'Formation du personnel',   'Formation continue', 'Sessions de mise à jour annuelles couvrant les changements réglementaires et les nouvelles typologies.', 'Annuel', null, false, null, null),
  ('P16', 16, 'Formation du personnel',   'Registre de formation', 'Tenir un registre de toutes les formations : dates, participants, contenu couvert.', null, null, false, null, null),
  ('P17', 17, 'Examen indépendant',       'Examen biennal', 'Faire examiner l''efficacité du programme de conformité par un tiers indépendant tous les deux ans.', 'Tous les 2 ans', '2028-10-06', false, null, null),
  ('P18', 18, 'Examen indépendant',       'Plan d''action correctif', 'Mettre en oeuvre les recommandations issues de l''examen indépendant.', null, null, false, null, null),
  ('P19', 19, 'Contrôles continus',       'Filtrage des sanctions en continu', 'Vérifier chaque client et opération contre les listes de sanctions canadiennes et internationales.', 'Continu', null, false, null, null),
  ('P20', 20, 'Contrôles continus',       'Filtrage PPV / DOI en continu', 'Déterminer si un client est une PPV nationale ou étrangère, un DOI, ou un membre de leur famille / proche.', 'Continu', null, false, null, null),
  ('P21', 21, 'Contrôles continus',       'Surveillance des opérations', 'Surveiller les opérations pour détecter les seuils (DOIMV ≥ 10 000 $) et les comportements suspects.', 'Continu', null, false, null, null),
  ('P22', 22, 'Contrôles continus',       'Mise à jour des dossiers clients', 'Vérifier que les informations des clients sont à jour, particulièrement avant les opérations.', 'Continu', null, false, null, null)
on conflict (id) do nothing;

-- ─────────────── Accès ───────────────

alter table public.compliance_alerts enable row level security;
alter table public.compliance_declarations enable row level security;
alter table public.compliance_checklist enable row level security;

create policy "Admin gère les alertes de conformité" on public.compliance_alerts
  for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin gère les déclarations CANAFE" on public.compliance_declarations
  for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin gère le programme de conformité" on public.compliance_checklist
  for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Pas de suppression : les dossiers de conformité se conservent 5 ans.
create or replace function public.compliance_no_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_trusted_writer() then
    raise exception 'Dossier de conformité : conservation obligatoire de 5 ans, suppression impossible.' using errcode = '42501';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_compliance_alerts_no_delete on public.compliance_alerts;
create trigger trg_compliance_alerts_no_delete before delete on public.compliance_alerts
  for each row execute function public.compliance_no_delete();
drop trigger if exists trg_compliance_declarations_no_delete on public.compliance_declarations;
create trigger trg_compliance_declarations_no_delete before delete on public.compliance_declarations
  for each row execute function public.compliance_no_delete();

drop trigger if exists compliance_alerts_touch on public.compliance_alerts;
create trigger compliance_alerts_touch before update on public.compliance_alerts
  for each row execute function public.touch_updated_at();
drop trigger if exists compliance_declarations_touch on public.compliance_declarations;
create trigger compliance_declarations_touch before update on public.compliance_declarations
  for each row execute function public.touch_updated_at();
drop trigger if exists compliance_checklist_touch on public.compliance_checklist;
create trigger compliance_checklist_touch before update on public.compliance_checklist
  for each row execute function public.touch_updated_at();

-- ─────────────── Commandes payées : pas de suppression ───────────────

create or replace function public.protect_paid_orders()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status not in ('created', 'awaiting_payment', 'cancelled', 'expired')
     or exists (select 1 from public.usdt_payouts p where p.order_id = old.id)
     or exists (select 1 from public.interac_receipts r where r.order_id = old.id and r.status = 'matched') then
    raise exception 'Commande payée : elle fait partie du registre des opérations (conservation 5 ans) et ne peut pas être supprimée.' using errcode = '42501';
  end if;
  return old;
end;
$$;
revoke execute on function public.protect_paid_orders() from anon, authenticated;

drop trigger if exists trg_protect_paid_orders on public.orders;
create trigger trg_protect_paid_orders before delete on public.orders
  for each row execute function public.protect_paid_orders();

-- ─────────────── Délais ───────────────

-- Date + n jours ouvrables (lundi à vendredi ; les jours fériés ne sont pas
-- retirés : l'échéance affichée est donc prudente d'un jour au plus).
create or replace function public.add_business_days(_d date, _n int)
returns date
language plpgsql
immutable
set search_path = ''
as $$
declare
  d date := _d;
  left_ int := _n;
begin
  while left_ > 0 loop
    d := d + 1;
    if extract(isodow from d) < 6 then
      left_ := left_ - 1;
    end if;
  end loop;
  return d;
end;
$$;

-- Montant au format québécois (12 500,00), indépendant de la locale du serveur.
create or replace function public.fr_money(_v numeric)
returns text
language sql
immutable
set search_path = ''
as $$
  select translate(to_char(_v, 'FM999,999,999,990.00'), ',.', ' ,');
$$;

-- ─────────────── Détection automatique ───────────────

-- Opérations « reçues » des 120 derniers jours : le client a payé (CAD reçus
-- pour un achat, USDT reçus pour une vente). received_at = moment où le
-- paiement a été constaté.
create or replace function public.compliance_ops()
returns table (id uuid, user_id uuid, side text, cad numeric, received_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select o.id, o.user_id, o.side::text, o.cad_amount,
         coalesce((select min(e.created_at) from public.order_events e
                    where e.order_id = o.id and e.new_status = 'payment_received'), o.created_at)
    from public.orders o
   where o.status in ('payment_received', 'settling', 'completed', 'refunded')
     and o.created_at > now() - interval '120 days';
$$;
revoke execute on function public.compliance_ops() from public, anon, authenticated;

create or replace function public.compliance_scan()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  created int := 0;
  n int;
begin
  -- Appel par un administrateur, par la clé service, ou par pg_cron (session
  -- interne, hors API). is_trusted_writer() ne convient pas ici : dans une
  -- fonction SECURITY DEFINER, current_user est toujours le propriétaire.
  if not (public.has_role(auth.uid(), 'admin')
          or coalesce(auth.role(), '') = 'service_role'
          or session_user <> 'authenticator') then
    raise exception 'Réservé aux administrateurs.' using errcode = '42501';
  end if;

  -- 1. DOIMV — une seule réception de monnaie virtuelle ≥ 10 000 $.
  insert into public.compliance_alerts (type, dedupe_key, order_id, order_ids, user_id, amount_cad, reason, occurred_at, due_date)
  select 'doimv', 'doimv:' || x.id, x.id, array[x.id], x.user_id, x.cad,
         'Réception de ' || public.fr_money(x.cad) || ' $ CA en USDT (vente OOB-' || upper(left(x.id::text, 8))
           || ') — seuil DOIMV de 10 000 $ atteint en une opération.',
         x.received_at,
         public.add_business_days((x.received_at at time zone 'America/Toronto')::date, 5)
    from public.compliance_ops() x
   where x.side = 'sell' and x.cad >= 10000
  on conflict (dedupe_key) do nothing;
  get diagnostics n = row_count; created := created + n;

  -- 2. DOIMV (règle des 24 heures) — plusieurs ventes d'un même client qui,
  --    ensemble, atteignent 10 000 $ en 24 heures consécutives. La clé est la
  --    première vente de la fenêtre : une seule alerte par fenêtre.
  insert into public.compliance_alerts (type, dedupe_key, order_id, order_ids, user_id, amount_cad, reason, occurred_at, due_date)
  with x as (select * from public.compliance_ops() where side = 'sell'),
  w as (
    select x.id, x.user_id, x.received_at,
           sum(y.cad) as total,
           array_agg(y.id order by y.received_at) as ids,
           max(y.cad) as biggest
      from x join x y on y.user_id = x.user_id
       and y.received_at > x.received_at - interval '24 hours' and y.received_at <= x.received_at
     group by x.id, x.user_id, x.received_at
  )
  select distinct on (w.ids[1])
         'doimv_24h', 'doimv24:' || w.ids[1], w.id, w.ids, w.user_id, w.total,
         array_length(w.ids, 1) || ' ventes du même client en 24 h totalisent ' || public.fr_money(w.total)
           || ' $ CA — règle des 24 heures (DOIMV).',
         w.received_at,
         public.add_business_days((w.received_at at time zone 'America/Toronto')::date, 5)
    from w
   where w.total >= 10000 and array_length(w.ids, 1) > 1 and w.biggest < 10000
   order by w.ids[1], w.received_at
  on conflict (dedupe_key) do nothing;
  get diagnostics n = row_count; created := created + n;

  -- 3. Soupçon — montant juste sous le seuil (9 000 à 9 999,99 $).
  insert into public.compliance_alerts (type, dedupe_key, order_id, order_ids, user_id, amount_cad, reason, occurred_at)
  select 'dot', 'sous_seuil:' || x.id, x.id, array[x.id], x.user_id, x.cad,
         (case when x.side = 'sell' then 'Vente' else 'Achat' end) || ' de ' || public.fr_money(x.cad)
           || ' $ CA, juste sous le seuil de 10 000 $. À examiner : évitement du seuil ?',
         x.received_at
    from public.compliance_ops() x
   where x.cad >= 9000 and x.cad < 10000
  on conflict (dedupe_key) do nothing;
  get diagnostics n = row_count; created := created + n;

  -- 4. Soupçon — fractionnement : au moins 3 opérations d'un même client en
  --    24 h, totalisant au moins 8 000 $ (achats et ventes confondus).
  insert into public.compliance_alerts (type, dedupe_key, order_id, order_ids, user_id, amount_cad, reason, occurred_at)
  with x as (select * from public.compliance_ops()),
  w as (
    select x.id, x.user_id, x.received_at,
           sum(y.cad) as total,
           array_agg(y.id order by y.received_at) as ids
      from x join x y on y.user_id = x.user_id
       and y.received_at > x.received_at - interval '24 hours' and y.received_at <= x.received_at
     group by x.id, x.user_id, x.received_at
  )
  select distinct on (w.ids[1])
         'dot', 'fraction:' || w.ids[1], w.id, w.ids, w.user_id, w.total,
         array_length(w.ids, 1) || ' opérations du même client en 24 h pour ' || public.fr_money(w.total)
           || ' $ CA. À examiner : fractionnement pour rester sous les seuils ?',
         w.received_at
    from w
   where w.total >= 8000 and array_length(w.ids, 1) >= 3
   order by w.ids[1], w.received_at
  on conflict (dedupe_key) do nothing;
  get diagnostics n = row_count; created := created + n;

  -- 5. Soupçon — virement Interac envoyé par une autre personne que le client.
  insert into public.compliance_alerts (type, dedupe_key, order_id, order_ids, user_id, amount_cad, reason, occurred_at)
  select 'dot', 'tiers:' || r.id, o.id, array[o.id], o.user_id, coalesce(r.amount_cad, o.cad_amount),
         'Virement Interac reçu de « ' || coalesce(nullif(r.sender_name, ''), '?') || ' » pour la commande OOB-'
           || upper(left(o.id::text, 8)) || ' : le nom ne correspond pas au client. Paiement d''un tiers ?',
         r.received_at
    from public.interac_receipts r
    join public.orders o on o.id = r.order_id
   where r.status = 'mismatch' and r.authenticated and r.reason like 'Expéditeur%'
  on conflict (dedupe_key) do nothing;
  get diagnostics n = row_count; created := created + n;

  return created;
end;
$$;
revoke execute on function public.compliance_scan() from anon;
grant execute on function public.compliance_scan() to authenticated;

-- ─────────────── Registre (export) ───────────────

create or replace function public.compliance_register(_kind text, _from timestamptz default null, _to timestamptz default null)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  f timestamptz := coalesce(_from, '-infinity'::timestamptz);
  t timestamptz := coalesce(_to, 'infinity'::timestamptz);
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Réservé aux administrateurs.' using errcode = '42501';
  end if;

  if _kind = 'operations' then
    return query
    select jsonb_build_object(
      'date', o.created_at,
      'reference', 'OOB-' || upper(left(o.id::text, 8)),
      'type', case when o.side = 'buy' then 'Achat' else 'Vente' end,
      'statut', o.status,
      'client', coalesce(nullif(p.business_name, ''), p.full_name),
      'courriel', p.email,
      'type_compte', p.account_type,
      'identite', p.kyc_status,
      'montant_cad', o.cad_amount,
      'montant_usdt', o.usdt_amount,
      'taux', o.locked_rate,
      'frais_cad', o.fee_cad,
      'reseau', o.network,
      'adresse_portefeuille', o.wallet_address,
      'courriel_interac', o.interac_email,
      'expediteur_interac', (select r.sender_name from public.interac_receipts r where r.order_id = o.id and r.status = 'matched' order by r.received_at limit 1),
      'reference_interac', (select r.interac_ref from public.interac_receipts r where r.order_id = o.id and r.status = 'matched' order by r.received_at limit 1),
      'hash_transaction', (select u.tx_hash from public.usdt_payouts u where u.order_id = o.id and u.status in ('broadcast', 'confirmed') order by u.created_at desc limit 1),
      'paiement_recu_le', (select min(e.created_at) from public.order_events e where e.order_id = o.id and e.new_status = 'payment_received'),
      'termine_le', (select min(e.created_at) from public.order_events e where e.order_id = o.id and e.new_status = 'completed')
    )
      from public.orders o
      left join public.profiles p on p.id = o.user_id
     where o.created_at >= f and o.created_at < t
       and o.status in ('payment_received', 'settling', 'completed', 'refunded')
     order by o.created_at;

  elsif _kind = 'identites' then
    return query
    select jsonb_build_object(
      'date', k.created_at,
      'verifie_le', coalesce(k.reviewed_at, k.updated_at),
      'client', coalesce(nullif(p.business_name, ''), p.full_name),
      'courriel', p.email,
      'type_compte', p.account_type,
      'fournisseur', k.provider,
      'reference_fournisseur', k.external_reference,
      'type_document', k.doc_type,
      'statut', k.status,
      'note', k.review_note
    )
      from public.kyc_verifications k
      left join public.profiles p on p.id = k.user_id
     where k.created_at >= f and k.created_at < t
     order by k.created_at;

  elsif _kind = 'interac' then
    return query
    select jsonb_build_object(
      'recu_le', r.received_at,
      'reference_interac', r.interac_ref,
      'expediteur', r.sender_name,
      'courriel_expediteur', r.from_email,
      'montant_cad', r.amount_cad,
      'commande', case when r.order_id is null then null else 'OOB-' || upper(left(r.order_id::text, 8)) end,
      'authentifie', r.authenticated,
      'statut', r.status,
      'motif', r.reason
    )
      from public.interac_receipts r
     where r.received_at >= f and r.received_at < t
     order by r.received_at;

  elsif _kind = 'envois' then
    return query
    select jsonb_build_object(
      'date', u.created_at,
      'commande', 'OOB-' || upper(left(u.order_id::text, 8)),
      'reseau', u.network,
      'adresse_emettrice', u.from_address,
      'adresse_beneficiaire', u.to_address,
      'montant_usdt', u.usdt_amount,
      'statut', u.status,
      'hash_transaction', u.tx_hash,
      'declenchement', u.trigger,
      'erreur', u.error
    )
      from public.usdt_payouts u
     where u.created_at >= f and u.created_at < t
     order by u.created_at;

  elsif _kind = 'declarations' then
    return query
    select jsonb_build_object(
      'creee_le', d.created_at,
      'reference', d.ref,
      'type', upper(d.type),
      'client', d.client_name,
      'montant_cad', d.amount_cad,
      'statut', d.status,
      'echeance', d.due_date,
      'soumise_le', d.submitted_at,
      'reference_canafe', d.canafe_ref,
      'alerte', (select a.ref from public.compliance_alerts a where a.id = d.alert_id)
    )
      from public.compliance_declarations d
     where d.created_at >= f and d.created_at < t
     order by d.created_at;

  elsif _kind = 'alertes' then
    return query
    select jsonb_build_object(
      'creee_le', a.created_at,
      'reference', a.ref,
      'type', a.type,
      'origine', a.source,
      'client', coalesce(nullif(p.business_name, ''), p.full_name),
      'courriel', p.email,
      'montant_cad', a.amount_cad,
      'motif', a.reason,
      'statut', a.status,
      'classement', a.classification,
      'notes', a.notes,
      'cloturee_le', a.closed_at
    )
      from public.compliance_alerts a
      left join public.profiles p on p.id = a.user_id
     where a.created_at >= f and a.created_at < t
     order by a.created_at;

  else
    raise exception 'Registre inconnu : %', _kind using errcode = '22023';
  end if;
end;
$$;
revoke execute on function public.compliance_register(text, timestamptz, timestamptz) from anon;
grant execute on function public.compliance_register(text, timestamptz, timestamptz) to authenticated;

-- Volumes du registre (tableau de bord de l'onglet Dossiers).
create or replace function public.compliance_register_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Réservé aux administrateurs.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'operations', (select count(*) from public.orders where status in ('payment_received', 'settling', 'completed', 'refunded')),
    'operations_1000', (select count(*) from public.orders where status in ('payment_received', 'settling', 'completed', 'refunded') and cad_amount >= 1000),
    'identites', (select count(*) from public.kyc_verifications),
    'identites_ok', (select count(*) from public.kyc_verifications where status = 'approved'),
    'entreprises', (select count(*) from public.profiles where account_type = 'business'),
    'interac', (select count(*) from public.interac_receipts),
    'envois', (select count(*) from public.usdt_payouts),
    'declarations', (select count(*) from public.compliance_declarations),
    'alertes', (select count(*) from public.compliance_alerts),
    'journal', (select count(*) from public.admin_audit_log),
    'plus_ancien', (select min(created_at) from public.orders where status in ('payment_received', 'settling', 'completed', 'refunded'))
  );
end;
$$;
revoke execute on function public.compliance_register_stats() from anon;
grant execute on function public.compliance_register_stats() to authenticated;

-- Analyse toutes les 10 minutes.
select cron.schedule('compliance-scan', '*/10 * * * *', $$select public.compliance_scan();$$);
