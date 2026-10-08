-- Adresses courriel jetables refusées à l'inscription.
--
-- • blocked_email_domains : domaines de messagerie temporaire (liste de
--   départ ci-dessous, complétée par l'équipe au besoin). Un sous-domaine
--   d'un domaine listé est aussi refusé.
-- • Trigger sur auth.users : l'inscription échoue côté serveur, quel que soit
--   le chemin (site, API directe).
-- • email_domain_allowed(email) : appelée par le site avant l'inscription
--   pour afficher un message clair (le refus serveur ne renvoie qu'une erreur
--   générique).
-- Aucune liste n'est complète : la vérification d'identité reste le vrai
-- contrôle. Appliquée en production le 2026-10-08.

create table if not exists public.blocked_email_domains (
  domain text primary key check (domain = lower(domain)),
  added_at timestamptz not null default now()
);
alter table public.blocked_email_domains enable row level security;
create policy "Staff lit les domaines bloqués" on public.blocked_email_domains
  for select using (public.is_staff(auth.uid()));
create policy "Admin gère les domaines bloqués" on public.blocked_email_domains
  for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

insert into public.blocked_email_domains (domain) values
  ('mailinator.com'),('mailinator.net'),('mailinator.org'),('guerrillamail.com'),('guerrillamail.net'),('guerrillamail.org'),
  ('guerrillamail.biz'),('guerrillamail.de'),('guerrillamailblock.com'),('sharklasers.com'),('grr.la'),('pokemail.net'),('spam4.me'),
  ('10minutemail.com'),('10minutemail.net'),('10minutemail.co.uk'),('20minutemail.com'),('temp-mail.org'),('temp-mail.io'),
  ('tempmail.com'),('tempmail.net'),('tempmail.dev'),('tempmailo.com'),('tempr.email'),('tempail.com'),('temp-mails.com'),
  ('tempinbox.com'),('tmpmail.org'),('tmpmail.net'),('tmpeml.com'),('tmails.net'),('yopmail.com'),('yopmail.fr'),('yopmail.net'),
  ('cool.fr.nf'),('jetable.fr.nf'),('courriel.fr.nf'),('moncourrier.fr.nf'),('monemail.fr.nf'),('monmail.fr.nf'),
  ('trashmail.com'),('trashmail.de'),('trashmail.net'),('trashmail.io'),('trash-mail.com'),('getnada.com'),('nada.email'),
  ('dispostable.com'),('maildrop.cc'),('mailnesia.com'),('mintemail.com'),('mohmal.com'),('emailondeck.com'),('fakeinbox.com'),
  ('throwawaymail.com'),('mailcatch.com'),('mytemp.email'),('burnermail.io'),('spamgourmet.com'),('inboxkitten.com'),
  ('mailpoof.com'),('emailfake.com'),('generator.email'),('moakt.com'),('moakt.cc'),('1secmail.com'),('1secmail.net'),
  ('1secmail.org'),('esiix.com'),('wwjmp.com'),('xojxe.com'),('yoggm.com'),('kzccv.com'),('qiott.com'),('dcctb.com'),
  ('emltmp.com'),('disposablemail.com'),('spambox.us'),('mailsac.com'),('harakirimail.com'),('discard.email'),('discardmail.com'),
  ('discardmail.de'),('mailexpire.com'),('mailforspam.com'),('getairmail.com'),('anonbox.net'),('mail-temp.com'),('tempmailaddress.com'),
  ('fakemail.net'),('fakemailgenerator.com'),('mailtemp.info'),('linshiyouxiang.net'),('mail.tm'),('mailto.plus'),('fexpost.com'),
  ('fexbox.org'),('mailbox.in.ua'),('rover.info'),('chitthi.in'),('fextemp.com'),('any.pink'),('merepost.com'),('dropmail.me'),
  ('10mail.org'),('emlpro.com'),('emlhub.com'),('freeml.net'),('spymail.one'),('minimail.gq'),('eyepaste.com'),('jetable.org'),
  ('mailmetrash.com'),('meltmail.com'),('mt2015.com'),('nomail.xl.cx'),('owlymail.com'),('rcpt.at'),('trbvm.com'),('wegwerfmail.de'),
  ('wegwerfmail.net'),('einrot.com'),('cuvox.de'),('dayrep.com'),('fleckens.hu'),('gustr.com'),('jourrapide.com'),('rhyta.com'),
  ('superrito.com'),('teleworm.us'),('armyspy.com'),('byom.de'),('mvrht.net'),('mailnull.com'),('incognitomail.org'),
  ('ruutukf.com'),('lnovic.com')
on conflict (domain) do nothing;

create or replace function public.email_domain_allowed(_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.blocked_email_domains b
     where lower(split_part(coalesce(_email, ''), '@', 2)) = b.domain
        or lower(split_part(coalesce(_email, ''), '@', 2)) like '%.' || b.domain
  );
$$;
grant execute on function public.email_domain_allowed(text) to anon, authenticated;

create or replace function public.block_disposable_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is not null and not public.email_domain_allowed(new.email) then
    raise exception 'Adresse courriel jetable refusée.' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke execute on function public.block_disposable_signup() from anon, authenticated;

drop trigger if exists trg_block_disposable_signup on auth.users;
create trigger trg_block_disposable_signup
  before insert or update of email on auth.users
  for each row execute function public.block_disposable_signup();
