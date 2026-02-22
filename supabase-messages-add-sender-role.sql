-- À exécuter si la table messages existe déjà sans sender_role (identification Marque/Boutique)
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS sender_role text;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_role_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_sender_role_check
  CHECK (sender_role IS NULL OR sender_role IN ('brand', 'boutique'));

COMMENT ON COLUMN public.messages.sender_role IS 'Marque ou boutique : qui a envoyé (pour affichage clair dans le fil).';
