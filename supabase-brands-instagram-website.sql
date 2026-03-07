-- Instagram et site web pour les marques (affichés après les valeurs sur la fiche).
-- À exécuter dans Supabase → SQL Editor.

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS instagram_handle text NULL,
  ADD COLUMN IF NOT EXISTS website_url text NULL;

COMMENT ON COLUMN public.brands.instagram_handle IS 'Présentez votre marque - compte Instagram sans @';
COMMENT ON COLUMN public.brands.website_url IS 'Présentez votre marque - URL du site web';
