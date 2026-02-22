-- ============================================================
-- Unified Inbox : migration placement_messages → messages
-- 1) Ajouter placement_id à messages (pour "dernier message par placement")
-- 2) Supprimer la table placement_messages
-- Exécuter dans Supabase → SQL Editor.
-- ============================================================

-- 1) Colonne placement_id sur messages (nullable, pour placement_action)
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS placement_id uuid REFERENCES public.placements(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.messages.placement_id IS 'Pour message_type = placement_action : id du placement concerné.';

CREATE INDEX IF NOT EXISTS idx_messages_placement_id ON public.messages(placement_id) WHERE placement_id IS NOT NULL;

-- 2) Suppression de la table placement_messages (tout centralisé dans messages)
DROP POLICY IF EXISTS "placement_messages_insert" ON public.placement_messages;
DROP POLICY IF EXISTS "placement_messages_select" ON public.placement_messages;
DROP TABLE IF EXISTS public.placement_messages CASCADE;
