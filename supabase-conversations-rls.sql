-- ============================================================
-- RLS sur la table conversations (messagerie B2B)
-- À exécuter dans Supabase → SQL Editor.
-- ============================================================
-- Règle : un utilisateur ne peut lire ou insérer une conversation
-- QUE si auth.uid() est l’un des participants (propriétaire du brand
-- ou du showroom de cette conversation).
-- ============================================================

alter table public.conversations enable row level security;

-- Lecture : uniquement si je suis le propriétaire du brand OU du showroom
drop policy if exists "conversations_select_own" on public.conversations;
create policy "conversations_select_own"
  on public.conversations for select
  to authenticated
  using (
    exists (select 1 from public.brands b where b.id = conversations.brand_id and b.owner_id = auth.uid())
    or exists (select 1 from public.showrooms s where s.id = conversations.showroom_id and s.owner_id = auth.uid())
  );

-- Insertion : uniquement si je suis le propriétaire du brand OU du showroom que j’insère
drop policy if exists "conversations_insert_own" on public.conversations;
create policy "conversations_insert_own"
  on public.conversations for insert
  to authenticated
  with check (
    exists (select 1 from public.brands b where b.id = brand_id and b.owner_id = auth.uid())
    or exists (select 1 from public.showrooms s where s.id = showroom_id and s.owner_id = auth.uid())
  );
