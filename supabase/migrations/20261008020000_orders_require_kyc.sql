-- Aucune commande sans vérification.
--
-- Jusqu'ici, seule l'application empêchait un particulier non vérifié de
-- passer un ordre ; un appel direct à l'API le permettait. La base refuse
-- désormais tout ordre d'un particulier dont l'identité n'est pas approuvée
-- (les entreprises l'étaient déjà). L'équipe (admin, opérateur) reste exemptée
-- pour les tests. Reprend 20261007030000_flat_rate_sell_limits.sql.
-- Appliquée en production le 2026-10-08.

create or replace function public.enforce_order_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  r record;
  ref_rate numeric;
  tolerance numeric;
  lim numeric;
  used numeric;
  label text;
begin
  if public.is_trusted_writer()
     or public.has_role(auth.uid(), 'admin')
     or public.has_role(auth.uid(), 'operator') then
    return new;
  end if;

  if exists (
    select 1 from public.profiles p
     where p.id = new.user_id and p.account_type = 'business' and p.business_status <> 'approved'
  ) then
    raise exception 'Votre entreprise doit être vérifiée avant de passer un ordre.'
      using errcode = '42501';
  end if;

  -- Particulier : identité vérifiée obligatoire (règle CANAFE). Le contrôle
  -- de l'application ne suffit pas, un appel direct à l'API le contournerait.
  if exists (
    select 1 from public.profiles p
     where p.id = new.user_id
       and p.account_type is distinct from 'business'
       and p.kyc_status is distinct from 'approved'
  ) then
    raise exception 'Votre identité doit être vérifiée avant de passer un ordre.'
      using errcode = '42501';
  end if;

  new.status := 'created';
  new.fee_cad := 0;
  new.assigned_to := null;
  new.rate_locked_until := now() + interval '15 minutes';
  new.created_at := now();
  new.updated_at := now();

  select buy_rate, sell_rate, fetched_at into r
    from public.exchange_rates order by fetched_at desc limit 1;

  if found then
    ref_rate := case when new.side = 'buy' then r.buy_rate else r.sell_rate end;
    tolerance := case when r.fetched_at > now() - interval '1 hour' then 0.015 else 0.05 end;
    if new.locked_rate is null or ref_rate is null or ref_rate <= 0
       or abs(new.locked_rate - ref_rate) / ref_rate > tolerance then
      raise exception 'Le taux a changé. Actualisez la page puis réessayez.'
        using errcode = '22023';
    end if;
  end if;

  if new.locked_rate is null or new.locked_rate <= 0 then
    raise exception 'Taux invalide.' using errcode = '22023';
  end if;

  if new.side = 'buy' then
    new.usdt_amount := round(new.cad_amount / new.locked_rate, 6);
  else
    new.cad_amount := round(new.usdt_amount * new.locked_rate, 2);
  end if;

  -- Limites, sur le montant en CAD.
  label := case when new.side = 'buy' then 'achat' else 'vente' end;
  if new.cad_amount is null or new.cad_amount < 100 then
    raise exception 'Le montant minimum d''une % est de 100 $.', label using errcode = '22023';
  end if;
  if new.cad_amount > 9999 then
    raise exception 'Le montant maximum d''une % est de 9 999 $.', label using errcode = '22023';
  end if;

  -- Un ordre à la fois par client et par sens, pour que le cumul soit exact.
  perform pg_advisory_xact_lock(hashtext('ooble-' || new.side || ':' || new.user_id::text));

  select least(coalesce(p.daily_limit_cad, 9999), 9999) into lim
    from public.profiles p where p.id = new.user_id;
  select coalesce(sum(o.cad_amount), 0) into used
    from public.orders o
   where o.user_id = new.user_id
     and o.side = new.side
     and o.status not in ('cancelled', 'expired', 'refunded')
     and o.created_at > now() - interval '24 hours';

  if used + new.cad_amount > coalesce(lim, 9999) then
    raise exception 'Limite de % $ sur 24 heures : il vous reste % $.',
      round(coalesce(lim, 9999)), greatest(0, floor(coalesce(lim, 9999) - used))
      using errcode = '22023';
  end if;

  return new;
end;
$$;
