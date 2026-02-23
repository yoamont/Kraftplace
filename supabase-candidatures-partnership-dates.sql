-- Remplacer la validité (7/14 jours) par date de début et date de fin du partenariat.
-- À exécuter dans Supabase → SQL Editor.

ALTER TABLE public.candidatures
  ADD COLUMN IF NOT EXISTS partnership_start_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS partnership_end_at timestamptz NULL;

COMMENT ON COLUMN public.candidatures.partnership_start_at IS 'Date de début du partenariat proposé.';
COMMENT ON COLUMN public.candidatures.partnership_end_at IS 'Date de fin du partenariat proposé (utilisé aussi pour expirer l''offre si non acceptée).';

-- Rendre validity_days optionnel (garder pour rétrocompat, plus utilisé dans le formulaire)
-- expires_at reste utilisé : on le met à jour avec partnership_end_at quand c'est le cas.
