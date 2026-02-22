-- Ajout des types de messages candidature dans le fil unifié
-- À exécuter après supabase-messaging-unified-migrate.sql

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_type_check;

ALTER TABLE public.messages ADD CONSTRAINT messages_type_check CHECK (
  type IN (
    'CHAT',
    'DEAL_SENT', 'DEAL_ACCEPTED', 'DEAL_DECLINED', 'DEAL_EXPIRED',
    'CANDIDATURE_SENT', 'OFFER_NEGOTIATED', 'CANDIDATURE_ACCEPTED', 'CANDIDATURE_REFUSED',
    'CONTRAT', 'PAYMENT_REQUEST', 'DOCUMENT'
  )
);
