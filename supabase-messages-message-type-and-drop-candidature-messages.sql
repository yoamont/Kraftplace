-- ============================================================
-- Unified Inbox : message_type sur messages + suppression candidature_messages
-- Exécuter dans Supabase → SQL Editor.
-- ============================================================

-- 1) Colonne message_type sur messages (défaut 'chat')
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'chat';

COMMENT ON COLUMN public.messages.message_type IS 'chat = message classique ; candidature_action, placement_action = actions système dans le fil.';

-- Contrainte optionnelle : limiter les valeurs
ALTER TABLE public.messages
DROP CONSTRAINT IF EXISTS messages_message_type_check;

ALTER TABLE public.messages
ADD CONSTRAINT messages_message_type_check
CHECK (message_type IN ('chat', 'candidature_action', 'placement_action'));

-- 2) Suppression de la table candidature_messages (tout centralisé dans messages)
DROP POLICY IF EXISTS "candidature_messages_select" ON public.candidature_messages;
DROP POLICY IF EXISTS "candidature_messages_insert" ON public.candidature_messages;
DROP TABLE IF EXISTS public.candidature_messages;
