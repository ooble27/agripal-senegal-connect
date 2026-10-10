-- Langue préférée de chaque client (fr / en), pour envoyer les courriels
-- de campagne dans sa langue. Enregistrée par l'app à chaque visite.

alter table public.profiles
  add column if not exists preferred_lang text
  check (preferred_lang in ('fr', 'en'));

create or replace function public.set_my_lang(p_lang text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or p_lang not in ('fr', 'en') then
    return;
  end if;
  update public.profiles
     set preferred_lang = p_lang
   where id = auth.uid()
     and preferred_lang is distinct from p_lang;
end;
$$;

revoke all on function public.set_my_lang(text) from public, anon;
grant execute on function public.set_my_lang(text) to authenticated;

-- Rétro-remplissage : la langue enregistrée avec les notifications du téléphone.
update public.profiles p
   set preferred_lang = s.lang
  from (
    select distinct on (user_id) user_id, lang
      from public.push_subscriptions
     where lang in ('fr', 'en')
     order by user_id, created_at desc
  ) s
 where s.user_id = p.id
   and p.preferred_lang is null;
