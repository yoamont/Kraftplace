-- Messagerie B2B : ajout sender_role (brand ou boutique) sur messages

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS sender_role text;

ALTER TABLE public.messages
ADD CONSTRAINT messages_sender_role_check
CHECK (sender_role IS NULL OR sender_role IN ('brand', 'boutique'));
