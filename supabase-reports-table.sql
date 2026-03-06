-- Table des signalements (profils marque / boutique)
-- À exécuter dans Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_entity_type text NOT NULL CHECK (reported_entity_type IN ('brand', 'showroom')),
  reported_entity_id bigint NOT NULL,
  reason text,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed'))
);

CREATE INDEX IF NOT EXISTS idx_reports_entity ON public.reports(reported_entity_type, reported_entity_id);
CREATE INDEX IF NOT EXISTS idx_reports_created ON public.reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Seul l'auteur du signalement peut insérer (lui-même) ; les admins pourraient avoir une policy dédiée plus tard.
DROP POLICY IF EXISTS "reports_insert_own" ON public.reports;
CREATE POLICY "reports_insert_own" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Lecture : uniquement son propre signalement (optionnel) ou via service_role pour le dashboard admin.
DROP POLICY IF EXISTS "reports_select_own" ON public.reports;
CREATE POLICY "reports_select_own" ON public.reports
  FOR SELECT USING (auth.uid() = reporter_id);

COMMENT ON TABLE public.reports IS 'Signalements de profils (marque ou boutique) pour modération.';
