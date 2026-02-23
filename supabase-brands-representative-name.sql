-- Nom et prénom du représentant (section avant e-mail sur Ma marque).
-- À exécuter dans Supabase → SQL Editor.

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS representative_name text NULL;

COMMENT ON COLUMN public.brands.representative_name IS 'Nom et prénom du représentant de la marque';
