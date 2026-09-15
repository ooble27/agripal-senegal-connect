-- Carnet de destinataires : le client enregistre ses adresses wallet (achat)
-- et ses courriels Interac (vente) pour ne pas les ressaisir à chaque ordre.

create type public.recipient_kind as enum ('wallet', 'interac');

create table public.saved_recipients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.recipient_kind not null,
  -- Nom donné par le client (« Mon Ledger », « Compte principal »).
  label text not null check (char_length(trim(label)) between 1 and 60),
  -- Adresse wallet pour `wallet`, courriel Interac pour `interac`.
  value text not null check (char_length(trim(value)) between 3 and 200),
  -- Le réseau n'a de sens que pour une adresse wallet : une même chaîne de
  -- caractères est valide sur des réseaux différents.
  network public.usdt_network,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint wallet_requires_network check (kind <> 'wallet' or network is not null),
  constraint interac_has_no_network check (kind <> 'interac' or network is null)
);

-- Un même destinataire n'est enregistré qu'une fois. `network` étant nul pour
-- les courriels Interac, il faut deux index partiels : un index unique ordinaire
-- traiterait chaque NULL comme distinct et laisserait passer les doublons.
create unique index saved_recipients_wallet_uniq
  on public.saved_recipients (user_id, value, network)
  where kind = 'wallet';

create unique index saved_recipients_interac_uniq
  on public.saved_recipients (user_id, value)
  where kind = 'interac';

create index saved_recipients_lookup_idx
  on public.saved_recipients (user_id, kind, last_used_at desc nulls last);

alter table public.saved_recipients enable row level security;

-- Le carnet appartient au client : il le gère entièrement, et lui seul y accède.
create policy "Les utilisateurs voient leur carnet"
  on public.saved_recipients for select
  using (auth.uid() = user_id);

create policy "Les utilisateurs ajoutent à leur carnet"
  on public.saved_recipients for insert
  with check (auth.uid() = user_id);

create policy "Les utilisateurs modifient leur carnet"
  on public.saved_recipients for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Les utilisateurs suppriment de leur carnet"
  on public.saved_recipients for delete
  using (auth.uid() = user_id);
