-- Aligner status de la table candidatures sur l'enum : 'pending', 'accepted', 'rejected', 'cancelled'.
-- À exécuter dans Supabase → SQL Editor.

-- Migrer les données existantes : declined → rejected, expired → cancelled
UPDATE public.candidatures
SET status = 'rejected'
WHERE status = 'declined';

UPDATE public.candidatures
SET status = 'cancelled'
WHERE status = 'expired';

-- Remplacer la contrainte
ALTER TABLE public.candidatures
  DROP CONSTRAINT IF EXISTS candidatures_status_check;

ALTER TABLE public.candidatures
  ADD CONSTRAINT candidatures_status_check CHECK (
    status IN ('pending', 'accepted', 'rejected', 'cancelled')
  );

COMMENT ON COLUMN public.candidatures.status IS 'pending | accepted | rejected | cancelled';
