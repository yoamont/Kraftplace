-- Colonne crédits pour les packs achetés (Stripe).
-- À exécuter dans Supabase → SQL Editor.

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS credits integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.brands.credits IS 'Crédits achetés (packs Stripe). Incrémenté par le webhook Stripe.';
