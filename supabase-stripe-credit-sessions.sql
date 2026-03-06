-- Idempotence : éviter de créditer deux fois la même session Stripe (webhook + page succès).
-- À exécuter dans Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.stripe_credit_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  brand_id bigint NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  credits_added integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_credit_sessions_session ON public.stripe_credit_sessions(session_id);
COMMENT ON TABLE public.stripe_credit_sessions IS 'Sessions Stripe déjà traitées pour ajout de crédits (idempotence webhook + confirm).';
