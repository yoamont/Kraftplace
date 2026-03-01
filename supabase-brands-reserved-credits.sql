-- Crédits réservés (candidatures en attente) : 1 crédit bloqué par candidature envoyée, débité à l'acceptation, rendu au refus/annulation.
-- À exécuter dans Supabase → SQL Editor.

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS reserved_credits integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.brands.reserved_credits IS 'Crédits réservés (candidatures en attente). Débités à l''acceptation, décrémentés au refus/annulation.';
