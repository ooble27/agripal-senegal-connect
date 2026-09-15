-- Question / réponse Interac unique par client (pour débloquer les virements de vente).
alter table public.profiles add column if not exists interac_question text;
alter table public.profiles add column if not exists interac_answer text;

-- Génère la Q/R pour les profils existants qui n'en ont pas.
update public.profiles
  set interac_question = 'Code Ooble ?',
      interac_answer   = 'OB' || upper(substr(replace(id::text, '-', ''), 1, 6))
where interac_question is null or interac_answer is null;

-- Met à jour le trigger new user pour inclure la Q/R.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, sell_ref, interac_question, interac_answer)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    'OB-' || upper(substr(replace(new.id::text, '-', ''), 1, 8)),
    'Code Ooble ?',
    'OB' || upper(substr(replace(new.id::text, '-', ''), 1, 6))
  );
  return new;
end; $$;

revoke execute on function public.handle_new_user() from anon, authenticated;
