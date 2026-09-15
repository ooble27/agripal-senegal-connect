-- Permet à l'admin de supprimer une commande depuis le back-office (idempotent).
drop policy if exists "Admin supprime les ordres" on public.orders;
create policy "Admin supprime les ordres" on public.orders
  for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));
