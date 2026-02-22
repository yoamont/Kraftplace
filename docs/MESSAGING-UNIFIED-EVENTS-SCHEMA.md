# Messagerie unifiée par événements – Schéma minimaliste

## Principes

- **Une table `conversations`** : un lien (brand_id, showroom_id).
- **Une table `messages`** : tout est un événement (chat, deal, contrat, paiement, document). Un fil = une conversation. Une seule requête partout.
- **Mise à jour d’état** : pour CONTRAT, PAYMENT_REQUEST, etc., on **met à jour la même ligne** (metadata + updated_at), pas de nouvelle ligne.
- **Sidebar et chat** : la même requête sur `messages` filtrée par `conversation_id`. Zéro désync.

---

## 1. Schéma SQL minimaliste

```sql
-- ============================================================
-- MESSAGERIE UNIFIÉE : conversations + messages (journal d'événements)
-- ============================================================

-- Une seule table conversations : lien brand <-> showroom
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id bigint NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  showroom_id bigint NOT NULL REFERENCES public.showrooms(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(brand_id, showroom_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_updated_at
  ON public.conversations(updated_at DESC);

-- Une seule table messages : journal d'activité (chat + deals + contrats + paiements + docs)
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Type d'événement (détermine le rendu et la sémantique)
  type text NOT NULL,

  -- Pour le chat : utilisateur et texte. Sinon souvent NULL (événement système).
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  content text,

  -- Données spécifiques à l'événement. Pour CONTRAT/PAYMENT : on met à jour cette ligne, pas de nouvelle ligne.
  metadata jsonb NOT NULL DEFAULT '{}',

  -- Optionnel : marquer comme lu (surtout pour CHAT)
  is_read boolean NOT NULL DEFAULT false
);

-- Contrainte sur les types autorisés (à adapter à ton vocabulaire)
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_type_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_type_check CHECK (
  type IN (
    'CHAT',
    'DEAL_SENT', 'DEAL_ACCEPTED', 'DEAL_DECLINED', 'DEAL_EXPIRED',
    'CONTRAT', 'PAYMENT_REQUEST', 'DOCUMENT'
  )
);

COMMENT ON COLUMN public.messages.type IS 'Type d''événement : CHAT, DEAL_*, CONTRAT, PAYMENT_REQUEST, DOCUMENT.';
COMMENT ON COLUMN public.messages.metadata IS 'Payload de l''événement. Pour CONTRAT/PAYMENT : mis à jour sur place (status, stripe_id, etc.).';

-- Index unique : une requête = conversation_id. Sidebar et chat utilisent exactement ça.
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON public.messages(conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_updated
  ON public.messages(conversation_id, updated_at DESC);

-- Trigger : mettre à jour conversations.updated_at à chaque insert/update de message
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

-- RLS (schéma minimal : accès si propriétaire du brand ou du showroom)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_select_own" ON public.conversations;
CREATE POLICY "conversations_select_own" ON public.conversations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.brands b WHERE b.id = conversations.brand_id AND b.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.showrooms s WHERE s.id = conversations.showroom_id AND s.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "conversations_insert_own" ON public.conversations FOR INSERT;
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
```

---

## 2. Mise à jour d’un événement (ex : CONTRAT pending → signed)

**Principe : une ligne = un événement.** Pour un contrat ou un paiement, on crée **une seule ligne** au moment de l’événement. Les changements d’état (signé, payé, contesté) se font par **UPDATE** de cette ligne (metadata + updated_at), pas par INSERT.

Exemple CONTRAT :

```sql
-- Création (envoi du contrat)
INSERT INTO public.messages (conversation_id, type, sender_id, content, metadata)
VALUES (
  :conversation_id,
  'CONTRAT',
  :sender_id,
  'Contrat de partenariat',
  '{"status": "pending", "document_url": "https://...", "validity_days": 30}'::jsonb
);

-- Mise à jour (signature) : même ligne, pas de nouvelle ligne
UPDATE public.messages
SET
  metadata = jsonb_set(metadata, '{status}', '"signed"'),
  metadata = jsonb_set(metadata, '{signed_at}', to_jsonb(now()::text)),
  updated_at = now()
WHERE id = :message_id AND type = 'CONTRAT';
```

Même idée pour PAYMENT_REQUEST : une ligne à la création, puis UPDATE du metadata (stripe_payment_intent_id, status: 'completed', etc.).

---

## 3. Une seule requête pour sidebar et chat

**Règle : tout se fait par `conversation_id`.**

- **Chat (fil)**  
  Une seule requête :

```sql
SELECT id, conversation_id, created_at, updated_at, type, sender_id, content, metadata, is_read
FROM public.messages
WHERE conversation_id = :conversation_id
ORDER BY created_at ASC;
```

- **Sidebar (dernier message par conversation)**  
  Même table, même colonne. Deux options :

  **Option A – Une requête “dernier message” par conversation (côté app)**  
  Après avoir chargé les conversations, récupérer les derniers messages en une fois :

```sql
SELECT DISTINCT ON (conversation_id)
  id, conversation_id, created_at, type, content, metadata
FROM public.messages
WHERE conversation_id = ANY(:conversation_ids)
ORDER BY conversation_id, created_at DESC;
```

  Puis en JS : un objet `lastMessageByConversationId[conversation_id]`. Pas de requête par candidature_id / placement_id, donc **0% de désync**.

  **Option B – Vue ou RPC**  
  Une vue `conversations_with_last_message` qui fait un `LEFT JOIN LATERAL` sur messages. La sidebar lit cette vue ; le chat lit `messages` avec le même `conversation_id`. Même source logique = même cohérence.

Exemple vue (optionnel) :

```sql
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
```

Sidebar : `SELECT * FROM conversations_with_last_message WHERE ...`.  
Chat : `SELECT * FROM messages WHERE conversation_id = :id ORDER BY created_at ASC`.  
Même fil = `conversation_id` partout.

---

## 4. Exemple JSONB : événement "Envoi de Deal"

Un “Deal” = une offre (commission, loyer, durée) envoyée par la marque à la boutique. On le modélise comme un événement **DEAL_SENT**. Acceptation / refus = soit mise à jour du metadata, soit événements séparés (DEAL_ACCEPTED / DEAL_DECLINED) selon ta préférence. Exemple avec un seul type DEAL_SENT et statut dans metadata :

```json
{
  "status": "pending",
  "commission_percent": 15,
  "rent": 200,
  "rent_period": "month",
  "validity_days": 14,
  "option_description": "Option standard",
  "expires_at": "2025-03-01T00:00:00Z"
}
```

Exemple d’insertion :

```sql
INSERT INTO public.messages (conversation_id, type, sender_id, content, metadata)
VALUES (
  :conversation_id,
  'DEAL_SENT',
  :brand_user_id,
  'Offre envoyée : 15% commission, 200€/mois',
  '{
    "status": "pending",
    "commission_percent": 15,
    "rent": 200,
    "rent_period": "month",
    "validity_days": 14,
    "option_description": "Option standard",
    "expires_at": "2025-03-01T00:00:00Z"
  }'::jsonb
);
```

Quand la boutique accepte : **UPDATE** de cette ligne (pas de nouvelle ligne “contrat”) :

```sql
UPDATE public.messages
SET
  metadata = jsonb_set(jsonb_set(metadata, '{status}', '"accepted"'), '{accepted_at}', to_jsonb(now()::text)),
  updated_at = now()
WHERE id = :message_id AND type = 'DEAL_SENT';
```

Si tu préfères une trace explicite “acceptation”, tu peux en plus insérer une ligne `DEAL_ACCEPTED` avec un `metadata.reference_message_id` pointant vers l’id du DEAL_SENT. Le fil reste ordonné par `created_at` ; sidebar et chat utilisent toujours la même requête sur `messages` par `conversation_id`.

---

## 5. Résumé des réponses au challenge

| Question | Réponse |
|----------|--------|
| Comment un CONTRAT peut-il passer de pending à signed sans nouvelle ligne ? | **UPDATE** de la même ligne : `metadata = jsonb_set(metadata, '{status}', '"signed"')` et `updated_at = now()`. Une ligne = un contrat ; les changements d’état sont des mises à jour. |
| Comment garantir que sidebar et chat utilisent la même requête ? | **Une seule clé de fil : `conversation_id`.** Chat : `WHERE conversation_id = :id`. Sidebar : même table, soit `DISTINCT ON (conversation_id)` pour le dernier message, soit une vue `conversations_with_last_message`. Aucun filtre par candidature_id / placement_id → une seule source, 0 désync. |
| Moins de code, moins de jointures | Plus de tables `candidature_messages`, `placement_messages`, `payment_requests` pour le fil : tout est dans `messages` avec `type` + `metadata`. Une jointure : `conversations` pour RLS et affichage (brand/showroom). |

---

## 6. Types d’événements suggérés (à étendre)

| type | Rôle | metadata typique |
|------|------|-------------------|
| CHAT | Message texte utilisateur | (vide ou preview) |
| DEAL_SENT | Offre envoyée | status, commission_percent, rent, validity_days, expires_at |
| DEAL_ACCEPTED | Offre acceptée | reference_message_id, accepted_at |
| DEAL_DECLINED | Offre refusée | reference_message_id, reason |
| CONTRAT | Contrat (créé puis mis à jour) | status (pending/signed), document_url, signed_at |
| PAYMENT_REQUEST | Demande de paiement (créée puis mise à jour) | amount_cents, currency, status, stripe_payment_intent_id |
| DOCUMENT | Partage de document | document_url, filename, mime_type |

Tout est dans une seule table ; le front et les APIs n’ont qu’une seule requête par conversation pour le fil et une seule logique pour le “dernier message” de la sidebar.
