-- Informations juridiques et de contact des boutiques (Ma boutique).
-- À exécuter dans Supabase → SQL Editor.

ALTER TABLE public.showrooms
  ADD COLUMN IF NOT EXISTS legal_status text NULL,
  ADD COLUMN IF NOT EXISTS legal_status_other text NULL,
  ADD COLUMN IF NOT EXISTS company_name text NULL,
  ADD COLUMN IF NOT EXISTS registered_address text NULL,
  ADD COLUMN IF NOT EXISTS siret text NULL,
  ADD COLUMN IF NOT EXISTS representative_name text NULL,
  ADD COLUMN IF NOT EXISTS email text NULL,
  ADD COLUMN IF NOT EXISTS phone text NULL;

COMMENT ON COLUMN public.showrooms.legal_status IS 'Statut juridique : sarl, sas, sasu, sa, eurl, ei, microentrepreneur, association, other';
COMMENT ON COLUMN public.showrooms.legal_status_other IS 'Précision du statut juridique lorsque legal_status = other';
COMMENT ON COLUMN public.showrooms.company_name IS 'Nom de l''entreprise (raison sociale)';
COMMENT ON COLUMN public.showrooms.registered_address IS 'Adresse de domiciliation';
COMMENT ON COLUMN public.showrooms.siret IS 'Numéro SIRET (14 chiffres)';
COMMENT ON COLUMN public.showrooms.representative_name IS 'Nom et prénom du représentant';
COMMENT ON COLUMN public.showrooms.email IS 'E-mail de contact';
COMMENT ON COLUMN public.showrooms.phone IS 'Téléphone (optionnel)';

ALTER TABLE public.showrooms DROP CONSTRAINT IF EXISTS showrooms_siret_format;
ALTER TABLE public.showrooms ADD CONSTRAINT showrooms_siret_format
  CHECK (siret IS NULL OR siret ~ '^[0-9]{14}$');
