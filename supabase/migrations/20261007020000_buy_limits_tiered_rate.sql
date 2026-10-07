-- Achats : limites et taux selon le montant.
--
--   • Un achat : 100 $ minimum, 9 999 $ maximum.
--   • Sur 24 heures glissantes, le total des achats (hors ordres annulés,
--     expirés ou remboursés) ne dépasse pas la limite du compte
--     (profiles.daily_limit_cad, plafonnée à 9 999 $) : sous le seuil de
--     déclaration CANAFE de 10 000 $ sur 24 heures.
--   • Moins de 1 000 $ : taux d'achat majoré de 4 %. À partir de 1 000 $ :
--     taux publié.
--
-- Mêmes règles côté application (src/lib/buyPricing.ts) ; la base reste
-- l'autorité. Les ventes ne changent pas.
--
-- Idempotente ; déjà appliquée en production le 2026-10-07.

-- Les comptes créés avant le passage à 9 999 $ gardaient 3 000 $.
update public.profiles set daily_limit_cad = 9999 where daily_limit_cad = 3000;

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

  -- Achats : montant par ordre et cumul sur 24 heures.
  if new.side = 'buy' then
    if new.cad_amount is null or new.cad_amount < 100 then
      raise exception 'Le montant minimum d''un achat est de 100 $.' using errcode = '22023';
    end if;
    if new.cad_amount > 9999 then
      raise exception 'Le montant maximum d''un achat est de 9 999 $.' using errcode = '22023';
    end if;

    -- Un achat à la fois par client, pour que le cumul soit exact.
    perform pg_advisory_xact_lock(hashtext('ooble-buy:' || new.user_id::text));

    select least(coalesce(p.daily_limit_cad, 9999), 9999) into lim
      from public.profiles p where p.id = new.user_id;
    select coalesce(sum(o.cad_amount), 0) into used
      from public.orders o
     where o.user_id = new.user_id
       and o.side = 'buy'
       and o.status not in ('cancelled', 'expired', 'refunded')
       and o.created_at > now() - interval '24 hours';

    if used + new.cad_amount > coalesce(lim, 9999) then
      raise exception 'Limite de % $ sur 24 heures : il vous reste % $.',
        round(coalesce(lim, 9999)), greatest(0, floor(coalesce(lim, 9999) - used))
        using errcode = '22023';
    end if;
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
    ref_rate := case
      when new.side = 'buy' then r.buy_rate * (case when new.cad_amount < 1000 then 1.04 else 1 end)
      else r.sell_rate
    end;
    tolerance := case when r.fetched_at > now() - interval '1 hour' then 0.015 else 0.05 end;
    if new.locked_rate is null or ref_rate is null or ref_rate <= 0
       or abs(new.locked_rate - ref_rate) / ref_rate > tolerance then
      raise exception 'Le taux a changé. Actualisez la page puis réessayez.'
        using errcode = '22023';
    end if;
  end if;

  if new.side = 'buy' then
    new.usdt_amount := round(new.cad_amount / new.locked_rate, 6);
  else
    new.cad_amount := round(new.usdt_amount * new.locked_rate, 2);
  end if;
  return new;
end;
$$;
