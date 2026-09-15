-- Durcissement des fonctions : search_path fixe + révocation d'exécution.
-- Appliqué en base via Supabase MCP ; ce fichier en est le miroir versionné.

-- La fonction de trigger updated_at doit avoir un search_path vide et immuable
-- (recommandation des advisors Supabase).
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- handle_new_user est un trigger interne : il ne doit jamais être appelable
-- directement par les rôles anon/authenticated.
revoke execute on function public.handle_new_user() from anon, authenticated;
