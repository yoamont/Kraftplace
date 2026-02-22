-- Si la sidebar affiche un dernier message mais le fil est vide, la vue peut
-- s'exécuter avec des droits différents (bypass RLS). Recréer la vue avec
-- security_invoker = on pour que la même RLS s'applique que sur la table messages.
-- Exécuter dans Supabase SQL Editor (Postgres 15+).

DROP VIEW IF EXISTS public.conversations_with_last_message;

CREATE VIEW public.conversations_with_last_message
WITH (security_invoker = on)
AS
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

GRANT SELECT ON public.conversations_with_last_message TO authenticated;
GRANT SELECT ON public.conversations_with_last_message TO anon;
