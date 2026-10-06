-- Motif de refus d'une vérification d'identité, envoyé au client par
-- courriel et affiché sur sa page de vérification.
--
-- Idempotente ; déjà appliquée en production le 2026-10-07.

alter table public.kyc_verifications
  add column if not exists review_note text check (char_length(review_note) <= 1000),
  add column if not exists reviewed_at timestamptz;
