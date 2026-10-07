-- Messagerie : deux boîtes de réception.
--   support@ooble.ca  → mailbox = 'support' (par défaut)
--   otc@ooble.ca      → mailbox = 'otc'     (desk gros volumes)
-- mail-webhook et le formulaire de contact (send-email) remplissent la
-- colonne ; les réponses partent avec <boîte>+t.<fil>@ooble.ca en Reply-To.
--
-- Idempotente ; déjà appliquée en production le 2026-10-07.

alter table public.mail_threads
  add column if not exists mailbox text not null default 'support';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'mail_threads_mailbox_check'
  ) then
    alter table public.mail_threads
      add constraint mail_threads_mailbox_check check (mailbox in ('support', 'otc'));
  end if;
end $$;

create index if not exists idx_mail_threads_mailbox on public.mail_threads(mailbox, last_message_at desc);
