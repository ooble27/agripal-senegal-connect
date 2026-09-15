-- Planifie le rafraîchissement du taux USDT/CAD toutes les 10 minutes.
-- Requiert la fonction edge `refresh-rate` déployée (verify_jwt = false).
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'refresh-usdt-rate',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://uukxacjjviiktmbikdwp.supabase.co/functions/v1/refresh-rate',
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
  $$
);
