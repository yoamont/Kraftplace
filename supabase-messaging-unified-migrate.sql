-- ============================================================
-- MESSAGERIE UNIFIÉE PAR ÉVÉNEMENTS – Migration (destruction & reconstruction)
-- À exécuter dans Supabase SQL Editor. Sauvegarder les messages existants si besoin.
-- ============================================================

-- 1) Sauvegarde optionnelle des anciens messages (décommenter si besoin)
-- CREATE TABLE IF NOT EXISTS public.messages_backup AS SELECT * FROM public.messages;

-- 2) Supprimer la vue et le trigger avant de toucher à messages
DROP VIEW IF EXISTS public.conversations_with_last_message;

DROP TRIGGER IF EXISTS messages_set_conversation_updated_at ON public.messages;
DROP TRIGGER IF EXISTS messages_updated_at ON public.messages;

-- 3) Supprimer les anciennes policies et contraintes sur messages
DROP POLICY IF EXISTS "messages_select_own" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
DROP POLICY IF EXISTS "messages_update_own" ON public.messages;
DROP POLICY IF EXISTS "messages_update_read_own" ON public.messages;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_conversation_or_candidature;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_type_check;

-- 4) Destruction : supprimer la table messages (tout passe par conversation_id)
DROP TABLE IF EXISTS public.messages;

-- 5) Reconstruction : table messages (journal d'événements unique)
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_role text,
  content text,
  metadata jsonb NOT NULL DEFAULT '{}',
  is_read boolean NOT NULL DEFAULT false,
  CONSTRAINT messages_sender_role_check CHECK (sender_role IS NULL OR sender_role IN ('brand', 'boutique'))
);
COMMENT ON COLUMN public.messages.sender_role IS 'Marque ou boutique : qui a envoyé (pour affichage clair dans le fil).';

ALTER TABLE public.messages ADD CONSTRAINT messages_type_check CHECK (
  type IN (
    'CHAT',
    'DEAL_SENT', 'DEAL_ACCEPTED', 'DEAL_DECLINED', 'DEAL_EXPIRED',
    'CANDIDATURE_SENT', 'OFFER_NEGOTIATED', 'CANDIDATURE_ACCEPTED', 'CANDIDATURE_REFUSED',
    'CONTRAT', 'PAYMENT_REQUEST', 'DOCUMENT'
  )
);

COMMENT ON TABLE public.messages IS 'Journal d''activité unifié : chat, deals, contrats, paiements, documents. Une seule clé : conversation_id.';
COMMENT ON COLUMN public.messages.metadata IS 'Payload de l''événement. Mise à jour sur place pour CONTRAT/PAYMENT (status, etc.).';

CREATE INDEX idx_messages_conversation_created
  ON public.messages(conversation_id, created_at ASC);

CREATE INDEX idx_messages_conversation_updated
  ON public.messages(conversation_id, updated_at DESC);

-- 6) Trigger : mettre à jour conversations.updated_at
CREATE OR REPLACE FUNCTION public.set_conversation_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER messages_set_conversation_updated_at
  AFTER INSERT OR UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.set_conversation_updated_at();

-- 7) RLS : seule la Marque ou la Boutique concernées voient le fil
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

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

-- 8) Vue sidebar : conversations + dernier message + noms/avatars (même requête logique que le chat)
CREATE OR REPLACE VIEW public.conversations_with_last_message AS
SELECT
  c.id,
  c.brand_id,
  c.showroom_id,
  c.updated_at,
  b.brand_name,
  b.avatar_url AS brand_avatar_url,
  s.name AS showroom_name,
  s.avatar_url AS showroom_avatar_url,
  m.id AS last_message_id,
  m.type AS last_message_type,
  m.content AS last_message_content,
  m.created_at AS last_message_at,
  m.metadata AS last_message_metadata
FROM public.conversations c
JOIN public.brands b ON b.id = c.brand_id
JOIN public.showrooms s ON s.id = c.showroom_id
LEFT JOIN LATERAL (
  SELECT id, type, content, created_at, metadata
  FROM public.messages
  WHERE conversation_id = c.id
  ORDER BY created_at DESC
  LIMIT 1
) m ON true;

COMMENT ON VIEW public.conversations_with_last_message IS 'Une requête pour la sidebar : même source que le chat (conversation_id).';

-- Permettre aux rôles authentifiés de lire la vue
GRANT SELECT ON public.conversations_with_last_message TO authenticated;
GRANT SELECT ON public.conversations_with_last_message TO anon;
