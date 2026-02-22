-- ============================================================
-- Messagerie unifiée au niveau Candidature (Marque–Boutique)
-- 1) Évolution de la table messages : candidature_id, type, metadata, nullable
-- 2) Triggers sur candidatures → messages système
-- 3) RLS et index pour chargement rapide
-- Exécuter dans Supabase → SQL Editor.
-- ============================================================

-- ---------------------------------------------------------------------------
-- 1) ÉVOLUTION DE LA TABLE MESSAGES
-- ---------------------------------------------------------------------------

-- Rendre conversation_id nullable (pour messages liés uniquement à une candidature)
ALTER TABLE public.messages
  ALTER COLUMN conversation_id DROP NOT NULL;

-- Ajouter candidature_id (FK vers candidatures)
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS candidature_id uuid REFERENCES public.candidatures(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.messages.candidature_id IS 'Fil de messages lié à une candidature (partenariat Marque–Boutique).';

-- Au moins une des deux clés doit être renseignée
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_conversation_or_candidature;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_conversation_or_candidature
  CHECK (conversation_id IS NOT NULL OR candidature_id IS NOT NULL);

-- Rendre sender_id nullable (messages système sans expéditeur physique)
ALTER TABLE public.messages
  ALTER COLUMN sender_id DROP NOT NULL;

-- Rendre content nullable (messages système basés sur metadata)
ALTER TABLE public.messages
  ALTER COLUMN content DROP NOT NULL;

-- Colonne type (défaut 'user')
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'user';

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_type_check;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_type_check
  CHECK (type IN ('user', 'system_offer_sent', 'system_offer_accepted', 'system_status_update'));

COMMENT ON COLUMN public.messages.type IS 'user = message utilisateur ; system_* = message système généré par les événements candidature.';

-- Colonne metadata (JSONB, nullable)
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS metadata jsonb;

COMMENT ON COLUMN public.messages.metadata IS 'Variables des événements système (ex: commission_rate, validity_days).';

-- Colonne updated_at + trigger
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE OR REPLACE FUNCTION public.set_messages_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_updated_at ON public.messages;
CREATE TRIGGER messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_messages_updated_at();

-- Index pour chargement rapide des messages par candidature
CREATE INDEX IF NOT EXISTS idx_messages_candidature_created
  ON public.messages(candidature_id, created_at ASC)
  WHERE candidature_id IS NOT NULL;

-- Index pour recherche par type (optionnel)
CREATE INDEX IF NOT EXISTS idx_messages_type
  ON public.messages(type)
  WHERE type LIKE 'system_%';

-- ---------------------------------------------------------------------------
-- 2) RLS : adapter les policies pour candidature_id
-- ---------------------------------------------------------------------------

-- Supprimer l’ancienne policy insert stricte (sender_id obligatoire)
DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;

-- Select : voir les messages si on a accès à la conversation OU à la candidature
DROP POLICY IF EXISTS "messages_select_own" ON public.messages;

CREATE POLICY "messages_select_own"
  ON public.messages FOR SELECT
  USING (
    (conversation_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
      AND (
        EXISTS (SELECT 1 FROM public.brands b WHERE b.id = c.brand_id AND b.owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.showrooms s WHERE s.id = c.showroom_id AND s.owner_id = auth.uid())
      )
    ))
    OR
    (candidature_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.candidatures c
      WHERE c.id = messages.candidature_id
      AND (
        EXISTS (SELECT 1 FROM public.brands b WHERE b.id = c.brand_id AND b.owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.showrooms s WHERE s.id = c.showroom_id AND s.owner_id = auth.uid())
      )
    ))
  );

-- Insert : en tant qu’utilisateur (sender_id = auth.uid()) dans une conversation ou candidature à laquelle j’ai accès.
-- Les messages système (type LIKE 'system_%', sender_id NULL) sont insérés uniquement par les triggers SECURITY DEFINER ;
-- le propriétaire de ces fonctions doit avoir BYPASSRLS (rôle postgres/supabase) pour que l’INSERT du trigger soit autorisé.
CREATE POLICY "messages_insert_own"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      (conversation_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = conversation_id
        AND (
          EXISTS (SELECT 1 FROM public.brands b WHERE b.id = c.brand_id AND b.owner_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.showrooms s WHERE s.id = c.showroom_id AND s.owner_id = auth.uid())
        )
      ))
      OR
      (candidature_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.candidatures c
        WHERE c.id = candidature_id
        AND (
          EXISTS (SELECT 1 FROM public.brands b WHERE b.id = c.brand_id AND b.owner_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.showrooms s WHERE s.id = c.showroom_id AND s.owner_id = auth.uid())
        )
      ))
    )
  );

-- Update (is_read, etc.) : même règle que select
DROP POLICY IF EXISTS "messages_update_read_own" ON public.messages;

CREATE POLICY "messages_update_read_own"
  ON public.messages FOR UPDATE
  USING (
    (conversation_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
      AND (
        EXISTS (SELECT 1 FROM public.brands b WHERE b.id = c.brand_id AND b.owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.showrooms s WHERE s.id = c.showroom_id AND s.owner_id = auth.uid())
      )
    ))
    OR
    (candidature_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.candidatures c
      WHERE c.id = messages.candidature_id
      AND (
        EXISTS (SELECT 1 FROM public.brands b WHERE b.id = c.brand_id AND b.owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.showrooms s WHERE s.id = c.showroom_id AND s.owner_id = auth.uid())
      )
    ))
  )
  WITH CHECK (true);


-- ============================================================
-- 3) TRIGGERS CANDIDATURES → MESSAGES SYSTÈME
-- ============================================================

-- Fonction : insérer un message système à la création d’une candidature
CREATE OR REPLACE FUNCTION public.on_candidature_created_system_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  opt_rent numeric;
  opt_period text;
  opt_commission numeric;
  opt_desc text;
  meta jsonb;
BEGIN
  meta := '{}'::jsonb;

  IF NEW.showroom_commission_option_id IS NOT NULL THEN
    SELECT rent, rent_period, commission_percent, description
      INTO opt_rent, opt_period, opt_commission, opt_desc
      FROM public.showroom_commission_options
      WHERE id = NEW.showroom_commission_option_id;

    meta := jsonb_build_object(
      'commission_percent', opt_commission,
      'rent', opt_rent,
      'rent_period', opt_period,
      'validity_days', NEW.validity_days,
      'option_description', opt_desc
    );
  ELSE
    meta := jsonb_build_object(
      'negotiation_message', NEW.negotiation_message,
      'validity_days', NEW.validity_days
    );
  END IF;

  INSERT INTO public.messages (
    candidature_id,
    sender_id,
    content,
    type,
    metadata,
    is_read
  ) VALUES (
    NEW.id,
    NULL,
    NULL,
    'system_offer_sent',
    meta,
    false
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS candidature_created_system_message ON public.candidatures;
CREATE TRIGGER candidature_created_system_message
  AFTER INSERT ON public.candidatures
  FOR EACH ROW
  EXECUTE FUNCTION public.on_candidature_created_system_message();


-- Fonction : insérer un message système quand le statut passe à 'accepted'
CREATE OR REPLACE FUNCTION public.on_candidature_accepted_system_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status <> 'accepted') THEN
    INSERT INTO public.messages (
      candidature_id,
      sender_id,
      content,
      type,
      metadata,
      is_read
    ) VALUES (
      NEW.id,
      NULL,
      NULL,
      'system_offer_accepted',
      jsonb_build_object('accepted_at', now(), 'validity_days', NEW.validity_days),
      false
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS candidature_accepted_system_message ON public.candidatures;
CREATE TRIGGER candidature_accepted_system_message
  AFTER UPDATE OF status ON public.candidatures
  FOR EACH ROW
  EXECUTE FUNCTION public.on_candidature_accepted_system_message();


-- Grant exécution des fonctions (déjà définies en security definer, les triggers s’exécutent côté serveur)
-- Rien à faire de plus pour les triggers.
