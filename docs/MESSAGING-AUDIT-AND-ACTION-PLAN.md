# Plan d’action : Messagerie unifiée (audit et refonte)

## 1. Audit du schéma de données

### 1.1 État actuel des tables

| Table | Rôle | Liens principaux |
|-------|------|-------------------|
| **conversations** | Une ligne par couple (brand_id, showroom_id) | brands, showrooms |
| **candidatures** | Négociation marque–boutique (option commission, statut) | brands, showrooms, showroom_commission_options. **Aucune FK vers conversations** |
| **messages** | Tous les messages (chat + système) | conversation_id (nullable), candidature_id (nullable), placement_id (nullable), sender_id |
| **placements** | Produits proposés à une boutique | products, showrooms |
| **payment_requests** | Demandes de paiement | placement_id, candidature_id, counterpart_* |
| **notifications** | Alertes utilisateur | user_id, reference_id (générique) |

### 1.2 Problèmes identifiés

1. **Lien candidature ↔ conversation uniquement implicite**  
   La relation est (brand_id, showroom_id). Il n’existe pas de `conversation_id` sur `candidatures`. Du coup :
   - Un message peut être stocké avec **candidature_id** (ex. depuis Discover) ou **conversation_id** (ex. depuis Curation/Placements).
   - La sidebar charge le dernier message en filtrant par **candidature_id**.
   - Le chat charge avec **candidature_id** OU **conversation_id** (fallback).
   - Résultat : deux sources de vérité, messages “fantômes” (visibles en aperçu mais pas dans le fil, ou l’inverse).

2. **Double clé sur messages**  
   `conversation_id` et `candidature_id` sont optionnels avec contrainte “au moins un”. Les écrans n’écrivent pas toujours la même clé → incohérence.

3. **Trigger `conversations.updated_at`**  
   Ne se déclenche que si `conversation_id` est renseigné sur le message. Les messages uniquement en `candidature_id` ne mettent pas à jour la conversation.

### 1.3 Structure recommandée : lier candidature à la conversation

**Principe : une seule clé de fil pour les messages = `conversation_id`. La candidature est un contexte optionnel du message.**

- **Option A (recommandée) : Tout message dans un fil “conversation”**  
  - Chaque message a **obligatoirement** `conversation_id` (FK vers la conversation du couple brand/showroom).
  - `candidature_id` et `placement_id` restent **optionnels** (contexte : “ce message concerne cette candidature / ce placement”).
  - Avantages : un seul critère de fetch (conversation_id), plus de divergence sidebar / chat.  
  - À faire en base : s’assurer qu’à l’insertion d’un message avec `candidature_id` on remplit aussi `conversation_id` (dérivé de la candidature : brand_id, showroom_id → conversation).

- **Option B : Lien explicite candidatures → conversation**  
  - Ajouter `conversation_id` (FK) sur `candidatures`.
  - À chaque création de candidature, créer ou récupérer la conversation (brand_id, showroom_id) et stocker son id.
  - Les messages continuent d’avoir soit conversation_id soit candidature_id, mais le front peut toujours dériver la conversation (via candidature.conversation_id ou via brand_id/showroom_id).

La suite du plan suppose **Option A** : un seul fil = une conversation ; candidature/placement = métadonnée du message.

---

## 2. Audit du flux de données (Frontend)

### 2.1 Pourquoi la sidebar voit “hey” et pas le chat ?

- **Sidebar** (`useConversations`) :
  - Charge les conversations (table `conversations`).
  - Pour chaque conversation, récupère la “dernière candidature” par (brand_id, showroom_id).
  - Dernier message : **une requête messages en `.in('candidature_id', candidatureIds)`** → donc uniquement les messages qui ont un `candidature_id`.
- **Chat** (`useMessages`) :
  - Reçoit `activeMessageId` = `candidatureId ?? conversationId` et `messageMode` = 'candidature' | 'conversation'.
  - En mode candidature : requête avec `.or('candidature_id.eq.X,conversation_id.eq.Y')` (si fallback) ou `.eq('candidature_id', X)`.

Conséquences :
- Si le message “hey” a été inséré **avec** `candidature_id`, la sidebar le voit. Si le chat utilise un mauvais id ou une requête qui échoue (ex. colonnes manquantes, RLS), le fil reste vide.
- Si “hey” a été inséré **sans** `candidature_id` (seulement `conversation_id`), la sidebar ne le voit pas (elle ne regarde que candidature_id), mais le chat pourrait le voir avec le fallback conversation_id → incohérence dans l’autre sens.

La racine est donc **deux façons de filtrer les messages** (candidature_id vs conversation_id) et **deux endroits** qui ne partagent pas la même logique.

### 2.2 Méthode de fetch unifiée recommandée

- **Une seule règle côté données** : tous les messages d’un “fil” ont le même `conversation_id`. Candidature/placement servent au contexte métier, pas au filtrage du fil.
- **Un seul hook côté front** : un hook qui ne connaît que la **conversation** (id). Il charge :
  - la liste des conversations (avec dernier message et unread) ;
  - les messages de la conversation sélectionnée.
- **Une seule requête messages pour le fil** :  
  `messages où conversation_id = :conversationId`, ordonnés par `created_at`.  
  Plus de mode “candidature” vs “conversation”, plus de `.or(candidature_id, conversation_id)`.
- **Sidebar** : dernier message = même requête `messages` mais filtrée par `conversation_id IN (...)` et tri par `created_at DESC`, puis “dernier par conversation” en JS. Ou une vue / fonction SQL “dernier message par conversation”.
- Ainsi, **sidebar et chat utilisent la même table et le même critère** (conversation_id) → cohérence garantie.

---

## 3. Recommandations “best practices”

### 3.1 Modèle de messages normalisé (types)

Garder **une seule table `messages`** avec :

- **`conversation_id`** (NOT NULL) : fil de la conversation.
- **`sender_id`** (nullable pour messages système) : utilisateur expéditeur.
- **`sender_role`** : 'brand' | 'boutique'.
- **`content`** (nullable) : texte libre ; vide pour certains types système.
- **`type`** (ou `message_type`) : enum clair, ex.  
  `'user' | 'system_offer_sent' | 'system_offer_accepted' | 'system_status_update' | 'system_placement_*' | 'document_shared'` (à étendre si besoin).
- **`metadata`** (jsonb, nullable) : pour les types système (commission_rate, validity_days, document_url, etc.) et éventuellement partage de document.
- **`candidature_id`** (nullable, FK) : si le message est lié à une candidature.
- **`placement_id`** (nullable, FK) : si le message est lié à un placement.
- **`is_read`**, **`created_at`**, **`updated_at`**.

Pas de table séparée par “type” de message : un seul flux par conversation, avec un type + metadata pour le rendu (bulle texte, badge système, document, etc.).

### 3.2 Indexation pour la performance

- **Obligatoire**  
  - `(conversation_id, created_at ASC)` : liste des messages d’une conversation (et pagination si besoin).
  - `(conversation_id, created_at DESC)` : dernier message par conversation (pour sidebar), ou utiliser l’index ASC avec `ORDER BY created_at DESC LIMIT 1` par conversation.
- **Optionnel**  
  - `(candidature_id, created_at)` si vous gardez des requêtes filtrées par candidature.
  - `(placement_id, created_at)` si fil par placement.
  - Index partiel sur `type` si beaucoup de messages système et requêtes par type.
- **RLS** : les policies sur `messages` doivent s’appuyer sur `conversations` (brand/showroom owner). Éviter les sous-requêtes lourdes ; une vue ou une fonction “conversation visible par auth.uid()” peut aider.

---

## 4. Plan d’action technique

### Phase 1 : Schéma SQL (base saine)

À exécuter dans l’ordre (Supabase SQL Editor).

**1.1 Lien candidature → conversation (optionnel mais recommandé)**

```sql
-- Ajouter conversation_id à candidatures pour traçabilité
ALTER TABLE public.candidatures
  ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_candidatures_conversation_id ON public.candidatures(conversation_id) WHERE conversation_id IS NOT NULL;

-- Remplir les existants : une conversation par (brand_id, showroom_id)
UPDATE public.candidatures c
SET conversation_id = conv.id
FROM public.conversations conv
WHERE conv.brand_id = c.brand_id AND conv.showroom_id = c.showroom_id
  AND c.conversation_id IS NULL;
```

**1.2 Rendre conversation_id obligatoire sur messages (source unique du fil)**

```sql
-- Remplir conversation_id pour les messages qui ne l'ont pas (dérivé de candidature ou de l’autre côté)
UPDATE public.messages m
SET conversation_id = conv.id
FROM public.conversations conv
WHERE m.conversation_id IS NULL
  AND m.candidature_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.candidatures c
    WHERE c.id = m.candidature_id AND c.brand_id = conv.brand_id AND c.showroom_id = conv.showroom_id
  );

-- Pour les messages avec seulement conversation_id côté opposé, rien à faire si déjà rempli.
-- Ensuite : rendre conversation_id NOT NULL
ALTER TABLE public.messages
  ALTER COLUMN conversation_id SET NOT NULL;

-- Réactiver la contrainte "au moins une des deux" n'est plus nécessaire si tout passe par conversation_id.
-- Garder candidature_id et placement_id en option pour le contexte.
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_conversation_or_candidature;
```

**1.3 Trigger : mettre à jour conversations.updated_at pour tout message**

```sql
CREATE OR REPLACE FUNCTION public.set_conversation_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.conversation_id IS NOT NULL THEN
    UPDATE public.conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_set_conversation_updated_at ON public.messages;
CREATE TRIGGER messages_set_conversation_updated_at
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.set_conversation_updated_at();
```

**1.4 Index et politique de sélection**

- S’assurer que l’index sur `(conversation_id, created_at)` existe (déjà dans la base ou à créer).
- Les policies RLS existantes sur `messages` (accès via conversation ou candidature) peuvent rester ; si tout message a maintenant un `conversation_id`, la branche “conversation” suffit pour le fil.

**1.5 Insertion côté app**

- À chaque insertion de message (user ou système) : **toujours** renseigner `conversation_id`.
  - Si on a un `candidature_id` : récupérer la conversation via `candidatures.conversation_id` ou via (brand_id, showroom_id) de la candidature.
  - Sinon : récupérer/créer la conversation (brand_id, showroom_id) comme aujourd’hui.

---

### Phase 2 : Frontend – fetch unifié

**2.1 Un seul hook : “fil = conversation”**

- Renommer / simplifier le hook pour qu’il ne prenne qu’un **conversationId** (et userId pour envoi / marquer lu).
- Une seule requête messages :  
  `where conversation_id = conversationId order by created_at asc`.
- Supprimer le mode “candidature” vs “conversation” et le paramètre `conversationIdForFallback`.
- Realtime : un seul abonnement sur `conversation_id = :id`.

**2.2 Sidebar : dernier message par conversation**

- Soit une requête messages groupée par `conversation_id` avec “dernier message” (agrégation ou fenêtre SQL).
- Soit garder la logique actuelle mais en ne filtrant plus par `candidature_id` : filtrer par **conversation_id** (liste des id de conversations affichées). Ainsi sidebar et chat utilisent la même colonne.

**2.3 Page messages**

- `selectedId` = id de la **conversation** (comme aujourd’hui).
- Plus de `activeMessageId` / `messageMode` : on passe uniquement `conversationId` au hook de messages.
- Candidature : garder `selected?.candidatureId` pour l’UI (ex. lien “Voir la candidature”) mais pas pour le chargement des messages.

**2.4 Envoi de message**

- Depuis la page messagerie : toujours envoyer avec `conversation_id` (+ optionnellement `candidature_id` si on veut marquer “ce message concerne cette candidature”).
- Depuis Discover / Curation / Placements : avant d’insérer le message, récupérer ou créer la conversation (brand_id, showroom_id), puis insérer avec `conversation_id` (et candidature_id/placement_id si besoin).

---

### Phase 3 : Structure des composants React/Next.js

- **`/messages`** (page)  
  - Utilise `useConversations(userId, activeBrand, activeShowroom)` pour la liste à gauche.  
  - Utilise `useMessages(conversationId, userId)` pour le fil à droite (un seul paramètre “conversation”).  
  - Passe `conversationId` (et plus `activeMessageId` / `messageMode`) à `ChatView`.

- **`useConversations`**  
  - Retourne les conversations avec lastMessage et unreadCount.  
  - LastMessage : requête sur `messages` filtrée par `conversation_id IN (…)`, tri `created_at DESC`, puis “un par conversation” (ou RPC/vue).

- **`useMessages(conversationId, userId)`**  
  - Fetch : `messages où conversation_id = conversationId`.  
  - Realtime : `conversation_id = conversationId`.  
  - sendMessage : insert avec `conversation_id`, et optionnellement `candidature_id` / `placement_id` si fournis par le contexte.

- **`ChatView`**  
  - Reçoit `conversationId`, `currentUserId`, `otherUserName`, etc.  
  - N’a plus besoin de `activeMessageId` ni `messageMode`.

- **Création de conversation**  
  - Centraliser dans une fonction (ex. `getOrCreateConversationId(brandId, showroomId)`) et l’utiliser partout (Discover, Curation, Placements, ContactBrandButton, etc.) avant d’insérer un message ou de rediriger vers `/messages?conversationId=...`.

---

## 5. Résumé des bénéfices

- **Plus de messages fantômes** : un seul fil = une conversation, une seule requête par écran.
- **Sidebar et chat cohérents** : même table, même clé `conversation_id`.
- **Modèle extensible** : types de messages (texte, système, document) via `type` + `metadata`, sans nouvelles tables.
- **Performance** : index sur (conversation_id, created_at), requêtes simples.
- **Évolutif** : ajout de `conversation_id` sur `candidatures` et remplissage des messages existants pour une base saine, puis simplification du front vers un seul flux “par conversation”.

Ce document peut servir de référence pour implémenter les migrations SQL puis les changements de hooks et de composants étape par étape.
