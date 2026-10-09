-- Notifications push actives pour tout le monde.
--
-- L'application abonne automatiquement chaque appareil (permission demandée
-- au premier toucher, sans bouton à activer) et enregistre l'abonnement par
-- cette fonction : un appareil = un abonnement, rattaché à la personne
-- connectée (reprend l'appareil si quelqu'un d'autre s'y était connecté),
-- avec la langue de l'application pour envoyer le message en français ou
-- en anglais.
-- Appliquée en production le 2026-10-09.

alter table public.push_subscriptions add column if not exists lang text not null default 'fr';
create unique index if not exists push_subscriptions_endpoint_key on public.push_subscriptions (endpoint);

create or replace function public.save_push_subscription(_endpoint text, _p256dh text, _auth text, _lang text default 'fr')
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentification requise.' using errcode = '42501';
  end if;
  if _endpoint !~ '^https://' or length(_endpoint) > 1000 or coalesce(_p256dh, '') = '' or coalesce(_auth, '') = '' then
    raise exception 'Abonnement invalide.' using errcode = '22023';
  end if;
  -- Un appareil = un abonnement, rattaché à la personne connectée.
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, lang)
  values (auth.uid(), _endpoint, _p256dh, _auth, case when _lang = 'en' then 'en' else 'fr' end)
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, lang = excluded.lang;
end;
$$;

revoke execute on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
