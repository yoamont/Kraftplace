-- Suppression de l'ancienne table conversation_messages.
-- Single source of truth : uniquement la table messages (avec conversation_id, sender_role, content).

drop policy if exists "conversation_messages_insert" on public.conversation_messages;
drop policy if exists "conversation_messages_select" on public.conversation_messages;
drop table if exists public.conversation_messages;
