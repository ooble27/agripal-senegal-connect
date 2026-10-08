-- Nom verrouillé après vérification d'identité.
--
-- L'envoi automatique des USDT compare le nom de l'expéditeur du virement
-- Interac au nom du profil. Un client ne doit donc plus pouvoir renommer son
-- profil une fois son identité approuvée (le nom est celui de la pièce).
-- Seuls un admin ou un vérificateur KYC peuvent encore le corriger.
-- Appliquée en production le 2026-10-08.

create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if public.is_trusted_writer() then
    return new;
  end if;
  if not (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'kyc_reviewer')) then
    new.kyc_status := old.kyc_status;
    new.business_status := old.business_status;
    -- Identité vérifiée : le nom est celui de la pièce, il ne change plus
    -- (sert à reconnaître le titulaire des virements Interac).
    if old.kyc_status = 'approved' then
      new.full_name := old.full_name;
    end if;
  end if;
  if not public.has_role(auth.uid(), 'admin') then
    new.daily_limit_cad := old.daily_limit_cad;
    new.email := old.email;
    new.sell_ref := old.sell_ref;
    new.account_type := old.account_type;
    new.business_name := old.business_name;
    new.business_number := old.business_number;
    new.business_address := old.business_address;
    new.business_phone := old.business_phone;
  end if;
  new.id := old.id;
  new.created_at := old.created_at;
  return new;
end;
$function$;
