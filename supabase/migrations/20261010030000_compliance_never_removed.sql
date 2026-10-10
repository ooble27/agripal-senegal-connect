-- Registre de conformité (alertes, déclarations) : jamais retiré, par
-- personne, serveur compris, avant comme après le lancement.
create or replace function public.compliance_no_delete()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Dossier de conformité : conservation obligatoire, suppression impossible.' using errcode = '42501';
end;
$$;
