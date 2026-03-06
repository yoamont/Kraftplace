-- ============================================================
-- PROTECTION DES CRÉDITS – Empêcher la modification directe
-- de credits / reserved_credits depuis le client (auth.uid() = authenticated).
-- Les mises à jour légitimes passent par les API routes avec service_role.
-- À exécuter dans Supabase SQL Editor après les politiques RLS brands.
-- ============================================================

CREATE OR REPLACE FUNCTION public.brands_protect_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Seul le rôle service_role (backend) peut modifier credits et reserved_credits.
  -- Les requêtes depuis l'app avec le JWT utilisateur ont role = 'authenticated'.
  IF (auth.jwt() ->> 'role') = 'authenticated' THEN
    NEW.credits := OLD.credits;
    -- Ne toucher reserved_credits que si la colonne existe (migration supabase-brands-reserved-credits.sql).
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'brands' AND column_name = 'reserved_credits'
    ) THEN
      NEW.reserved_credits := OLD.reserved_credits;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS brands_protect_credits_trigger ON public.brands;
CREATE TRIGGER brands_protect_credits_trigger
  BEFORE UPDATE ON public.brands
  FOR EACH ROW
  EXECUTE FUNCTION public.brands_protect_credits();

COMMENT ON FUNCTION public.brands_protect_credits() IS 'Bloque les mises à jour de credits/reserved_credits depuis le client (authenticated). Les API routes utilisent service_role.';
