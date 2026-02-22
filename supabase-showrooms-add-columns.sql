-- Ajouter code postal, type (permanent/éphémère) et dates à la table showrooms.
-- À exécuter dans Supabase → SQL Editor (table showrooms déjà existante).

ALTER TABLE showrooms
  ADD COLUMN IF NOT EXISTS code_postal text;

ALTER TABLE showrooms
  ADD COLUMN IF NOT EXISTS is_permanent boolean DEFAULT true;

ALTER TABLE showrooms
  ADD COLUMN IF NOT EXISTS start_date date;

ALTER TABLE showrooms
  ADD COLUMN IF NOT EXISTS end_date date;

-- Contrainte : si éphémère, end_date >= start_date (optionnel)
-- ALTER TABLE showrooms ADD CONSTRAINT showrooms_dates_check
--   CHECK (is_permanent OR (start_date IS NOT NULL AND end_date IS NOT NULL AND end_date >= start_date));
