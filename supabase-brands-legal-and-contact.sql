-- Informations juridiques et de contact des marques (Ma marque).
-- À exécuter dans Supabase → SQL Editor.

-- Statut juridique : valeur parmi une liste ou 'other' (détail dans legal_status_other)
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS legal_status text NULL,
  ADD COLUMN IF NOT EXISTS legal_status_other text NULL,
  ADD COLUMN IF NOT EXISTS company_name text NULL,
  ADD COLUMN IF NOT EXISTS registered_address text NULL,
  ADD COLUMN IF NOT EXISTS siret text NULL,
  ADD COLUMN IF NOT EXISTS email text NULL,
  ADD COLUMN IF NOT EXISTS phone text NULL,
  ADD COLUMN IF NOT EXISTS rc_pro_attestation_path text NULL;

COMMENT ON COLUMN public.brands.legal_status IS 'Statut juridique : sarl, sas, sasu, sa, eurl, ei, microentrepreneur, association, other';
COMMENT ON COLUMN public.brands.legal_status_other IS 'Précision du statut juridique lorsque legal_status = other';
COMMENT ON COLUMN public.brands.company_name IS 'Nom de l''entreprise (raison sociale)';
COMMENT ON COLUMN public.brands.registered_address IS 'Adresse de domiciliation';
COMMENT ON COLUMN public.brands.siret IS 'Numéro SIRET (14 chiffres)';
COMMENT ON COLUMN public.brands.email IS 'E-mail de contact';
COMMENT ON COLUMN public.brands.phone IS 'Téléphone (optionnel)';
COMMENT ON COLUMN public.brands.rc_pro_attestation_path IS 'Chemin du fichier attestation RC Pro dans le bucket brand-documents (privé)';

-- Contrainte optionnelle : SIRET 14 chiffres si renseigné
ALTER TABLE public.brands DROP CONSTRAINT IF EXISTS brands_siret_format;
ALTER TABLE public.brands ADD CONSTRAINT brands_siret_format
  CHECK (siret IS NULL OR siret ~ '^[0-9]{14}$');
