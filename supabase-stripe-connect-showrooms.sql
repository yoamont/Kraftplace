-- Stripe Connect : KYC boutiques avant réception de candidatures payantes
-- À exécuter dans Supabase SQL Editor.
-- Configurez Stripe Connect (Dashboard Stripe > Connect > Paramètres) puis liez les comptes.

ALTER TABLE public.showrooms
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id text NULL,
  ADD COLUMN IF NOT EXISTS stripe_connect_charges_enabled boolean NULL DEFAULT false;

COMMENT ON COLUMN public.showrooms.stripe_connect_account_id IS 'Compte Connect Stripe (acct_xxx) après onboarding.';
COMMENT ON COLUMN public.showrooms.stripe_connect_charges_enabled IS 'True quand le KYC est validé et que le compte peut recevoir des paiements.';

-- Mettre à jour charges_enabled via webhook Stripe (account.updated) ou après onboarding complet.
