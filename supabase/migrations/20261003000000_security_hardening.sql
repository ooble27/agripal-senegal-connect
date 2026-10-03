-- Durcissement de sécurité — profils et ordres.
--
-- 1. Un client ne peut plus modifier lui-même les champs sensibles de son
--    profil (statut KYC, limite, e-mail, référence de vente). Avant, la
--    politique « mise à jour de son profil » autorisait toutes les colonnes :
--    il suffisait d'un appel à l'API avec la clé publique pour se passer
--    « vérifié » ou relever sa limite.
-- 2. Un ordre créé par un client est recalculé côté serveur : statut initial
--    imposé, frais et verrouillage du taux fixés par le serveur, taux comparé
--    au dernier taux publié, montants recalculés à partir du taux.
--
-- Les écritures du serveur (fonctions edge en service_role, triggers
-- SECURITY DEFINER comme la synchro KYC) et celles du staff autorisé ne sont
-- pas concernées.
--
-- À exécuter une fois dans Supabase → SQL Editor (idempotent).

-- ---- Qui écrit ? ---------------------------------------------------------
-- Les fonctions de trigger ci-dessous ne sont PAS « security definer » : elles
-- s'exécutent avec le rôle de l'appelant, ce qui permet de reconnaître le
-- serveur (service_role, ou un trigger security definer appartenant à
-- postgres) d'un client connecté (authenticated).

create or replace function public.is_trusted_writer()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user in ('postgres', 'supabase_admin', 'service_role')
      or coalesce(auth.role(), '') = 'service_role';
$$;

-- ---- 1. Profils : champs sensibles protégés -----------------------------

create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_trusted_writer() then
    return new;
  end if;

  -- Statut KYC : seulement l'équipe KYC / admin.
  if not (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'kyc_reviewer')) then
    new.kyc_status := old.kyc_status;
  end if;

  -- Limite, e-mail et référence de vente : seulement un admin.
  if not public.has_role(auth.uid(), 'admin') then
    new.daily_limit_cad := old.daily_limit_cad;
    new.email := old.email;
    new.sell_ref := old.sell_ref;
  end if;

  new.id := old.id;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_fields on public.profiles;
create trigger trg_protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ---- 2. Ordres : contrôle à la création ---------------------------------

create or replace function public.enforce_order_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  r record;
  ref_rate numeric;
  tolerance numeric;
begin
  if public.is_trusted_writer()
     or public.has_role(auth.uid(), 'admin')
     or public.has_role(auth.uid(), 'operator') then
    return new;
  end if;

  -- Valeurs que seul le serveur fixe.
  new.status := 'created';
  new.fee_cad := 0;
  new.assigned_to := null;
  new.rate_locked_until := now() + interval '15 minutes';
  new.created_at := now();
  new.updated_at := now();

  -- Taux : doit correspondre au dernier taux publié (marge incluse).
  select buy_rate, sell_rate, fetched_at
    into r
    from public.exchange_rates
   order by fetched_at desc
   limit 1;

  if found then
    ref_rate := case when new.side = 'buy' then r.buy_rate else r.sell_rate end;
    tolerance := case when r.fetched_at > now() - interval '1 hour' then 0.015 else 0.05 end;
    if new.locked_rate is null or ref_rate is null or ref_rate <= 0
       or abs(new.locked_rate - ref_rate) / ref_rate > tolerance then
      raise exception 'Le taux a changé. Actualisez la page puis réessayez.'
        using errcode = '22023';
    end if;
  end if;

  -- Montants recalculés à partir du taux : impossible de les désaccorder.
  if new.side = 'buy' then
    new.usdt_amount := round(new.cad_amount / new.locked_rate, 6);
  else
    new.cad_amount := round(new.usdt_amount * new.locked_rate, 2);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_order_insert on public.orders;
create trigger trg_enforce_order_insert
  before insert on public.orders
  for each row execute function public.enforce_order_insert();

-- Ces fonctions ne s'appellent pas directement depuis l'API.
revoke execute on function public.protect_profile_fields() from anon, authenticated, public;
revoke execute on function public.enforce_order_insert() from anon, authenticated, public;
