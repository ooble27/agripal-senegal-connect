-- Back-office, onglet Clients : tous les inscrits en une requête, avec leur
-- vérification, leur lieu et leur source d'inscription, leurs commandes et
-- leur dernière connexion. Réservé à l'équipe (rien n'est renvoyé sinon).

create or replace function public.admin_clients()
returns table (
  id uuid,
  full_name text,
  email text,
  phone text,
  account_type text,
  business_name text,
  kyc_status text,
  business_status text,
  created_at timestamptz,
  closed_at timestamptz,
  is_staff boolean,
  orders integer,
  completed integer,
  volume_cad numeric,
  last_order_at timestamptz,
  last_sign_in_at timestamptz,
  country text,
  region text,
  city text,
  source text,
  origin_late boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id, p.full_name, p.email, p.phone, p.account_type::text, p.business_name,
    p.kyc_status::text, p.business_status::text, p.created_at, p.closed_at,
    exists (select 1 from public.user_roles r where r.user_id = p.id),
    coalesce(o.n, 0)::int, coalesce(o.done, 0)::int, coalesce(o.vol, 0), o.last_at,
    u.last_sign_in_at,
    so.country, so.region, so.city, so.source, so.late
  from public.profiles p
  left join auth.users u on u.id = p.id
  left join public.signup_origins so on so.user_id = p.id
  left join lateral (
    select count(*) as n,
           count(*) filter (where x.status = 'completed') as done,
           sum(x.cad_amount) filter (where x.status = 'completed') as vol,
           max(x.created_at) as last_at
    from public.orders x where x.user_id = p.id
  ) o on true
  where public.is_staff(auth.uid())
  order by p.created_at desc;
$$;

revoke all on function public.admin_clients() from public, anon;
grant execute on function public.admin_clients() to authenticated;
