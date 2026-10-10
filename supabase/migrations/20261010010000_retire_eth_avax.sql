-- Ethereum (ERC20) et Avalanche (C-Chain) ne sont plus proposés : frais
-- d'envoi trop élevés ou trop peu demandés. Aucun nouvel ordre sur ces
-- réseaux ; les ordres existants restent intacts et sont réglés normalement.

create or replace function public.reject_retired_network()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.network::text in ('erc20', 'avalanche') then
    raise exception 'NETWORK_RETIRED: % n''est plus proposé pour un nouvel ordre', new.network
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create or replace trigger orders_reject_retired_network
  before insert on public.orders
  for each row execute function public.reject_retired_network();
