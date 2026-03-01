-- Suppression de l'historique des conversations et des candidatures (messages).
-- À exécuter dans l'éditeur SQL Supabase (Dashboard > SQL Editor).
-- ATTENTION : irréversible. Toutes les conversations et tous les messages seront supprimés.

-- 1) Supprimer tous les messages (candidatures, chat, événements)
DELETE FROM public.messages;

-- 2) Supprimer toutes les conversations
DELETE FROM public.conversations;

-- Optionnel : réinitialiser les séquences si vous utilisez des id auto-incrémentés
-- (les tables utilisent uuid pour id, donc pas de séquence à réinitialiser)
