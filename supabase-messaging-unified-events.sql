-- ============================================================
-- Messagerie unifiée par événements
-- Une table conversations, une table messages (journal d'activité).
-- Sidebar + chat : même requête par conversation_id → 0% désync.
-- ============================================================
-- Exécuter dans Supabase SQL Editor (après avoir sauvegardé tes données si besoin).

-- ---------------------------------------------------------------------------
-- 1) CONVERSATIONS (inchangé : un lien brand <-> showroom)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id bigint NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  showroom_id bigint NOT NULL REFERENCES public.showrooms(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(brand_id, showroom_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_updated_at
  ON public.conversations(updated_at DESC);

-- ---------------------------------------------------------------------------
-- 2) MESSAGES : journal d'événements (CHAT, DEAL_*, CONTRAT, PAYMENT_REQUEST, DOCUMENT)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  content text,
  metadata jsonb NOT NULL DEFAULT '{}',
  is_read boolean NOT NULL DEFAULT false
);

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_type_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_type_check CHECK (
  type IN (
    'CHAT',
    'DEAL_SENT', 'DEAL_ACCEPTED', 'DEAL_DECLINED', 'DEAL_EXPIRED',
    'CONTRAT', 'PAYMENT_REQUEST', 'DOCUMENT'
  )
);

COMMENT ON COLUMN public.messages.type IS 'Type d''événement : CHAT, DEAL_*, CONTRAT, PAYMENT_REQUEST, DOCUMENT.';
COMMENT ON COLUMN public.messages.metadata IS 'Payload de l''événement. Mise à jour sur place pour CONTRAT/PAYMENT (status, etc.).';

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON public.messages(conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_updated
  ON public.messages(conversation_id, updated_at DESC);

-- ---------------------------------------------------------------------------
-- 3) Trigger : conversations.updated_at à chaque message
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_conversation_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_set_conversation_updated_at ON public.messages;
CREATE TRIGGER messages_set_conversation_updated_at
  AFTER INSERT OR UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.set_conversation_updated_at();

-- ---------------------------------------------------------------------------
-- 4) RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_select_own" ON public.conversations;
CREATE POLICY "conversations_select_own" ON public.conversations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.brands b WHERE b.id = conversations.brand_id AND b.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.showrooms s WHERE s.id = conversations.showroom_id AND s.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "conversations_insert_own" ON public.conversations;
CREATE POLICY "conversations_insert_own" ON public.conversations FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.showrooms s WHERE s.id = showroom_id AND s.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "messages_select_own" ON public.messages;
CREATE POLICY "messages_select_own" ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
      AND (
        EXISTS (SELECT 1 FROM public.brands b WHERE b.id = c.brand_id AND b.owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.showrooms s WHERE s.id = c.showroom_id AND s.owner_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
CREATE POLICY "messages_insert_own" ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND (
        EXISTS (SELECT 1 FROM public.brands b WHERE b.id = c.brand_id AND b.owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.showrooms s WHERE s.id = c.showroom_id AND s.owner_id = auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "messages_update_own" ON public.messages;
CREATE POLICY "messages_update_own" ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
      AND (
        EXISTS (SELECT 1 FROM public.brands b WHERE b.id = c.brand_id AND b.owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.showrooms s WHERE s.id = c.showroom_id AND s.owner_id = auth.uid())
      )
    )
  )
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 5) Vue optionnelle : dernier message par conversation (pour sidebar)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.conversations_with_last_message AS
SELECT
  c.id,
  c.brand_id,
  c.showroom_id,
  c.updated_at,
  m.id AS last_message_id,
  m.type AS last_message_type,
  m.content AS last_message_content,
  m.created_at AS last_message_at,
  m.metadata AS last_message_metadata
FROM public.conversations c
LEFT JOIN LATERAL (
  SELECT id, type, content, created_at, metadata
  FROM public.messages
  WHERE conversation_id = c.id
  ORDER BY created_at DESC
  LIMIT 1
) m ON true;
