-- Permet à un utilisateur connecté de créer ses propres ordres.
-- Appliqué en base via Supabase MCP ; ce fichier en est le miroir versionné.

create policy "Créer ses ordres" on public.orders
  for insert to authenticated
  with check (auth.uid() = user_id);
