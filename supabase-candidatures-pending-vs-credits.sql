-- Contrainte : une marque ne peut pas avoir plus de candidatures 'pending' que son nombre de crédits disponibles (brands.credits).
-- À exécuter dans Supabase → SQL Editor.

CREATE OR REPLACE FUNCTION public.check_candidatures_pending_vs_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  brand_credits integer;
  pending_count integer;
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(b.credits, 0) INTO brand_credits
  FROM public.brands b
  WHERE b.id = NEW.brand_id;

  IF brand_credits IS NULL THEN
    RAISE EXCEPTION 'Marque introuvable pour brand_id %', NEW.brand_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    SELECT COUNT(*)::integer INTO pending_count
    FROM public.candidatures c
    WHERE c.brand_id = NEW.brand_id AND c.status = 'pending';
    -- Après l'insert, il y aura pending_count + 1 candidatures pending
    IF (pending_count + 1) > brand_credits THEN
      RAISE EXCEPTION 'Crédits insuffisants : la marque a % crédit(s) et ne peut pas avoir plus de % candidature(s) en attente.', brand_credits, brand_credits;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND (OLD.status IS NULL OR OLD.status <> 'pending') THEN
    -- On passe à pending : compter les autres pending (sans cette ligne)
    SELECT COUNT(*)::integer INTO pending_count
    FROM public.candidatures c
    WHERE c.brand_id = NEW.brand_id AND c.status = 'pending' AND c.id <> NEW.id;
    IF (pending_count + 1) > brand_credits THEN
      RAISE EXCEPTION 'Crédits insuffisants : la marque a % crédit(s) et ne peut pas avoir plus de % candidature(s) en attente.', brand_credits, brand_credits;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS candidatures_check_pending_vs_credits ON public.candidatures;
CREATE TRIGGER candidatures_check_pending_vs_credits
  BEFORE INSERT OR UPDATE OF status
  ON public.candidatures
  FOR EACH ROW
  EXECUTE FUNCTION public.check_candidatures_pending_vs_credits();

COMMENT ON FUNCTION public.check_candidatures_pending_vs_credits() IS 'Vérifie que le nombre de candidatures pending pour une marque ne dépasse pas brands.credits.';
