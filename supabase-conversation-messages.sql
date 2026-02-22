-- Messages libres dans une conversation marque ↔ boutique (hors candidature/placement).
-- Permet d’envoyer un message à tout moment dans un bloc messagerie.

create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  brand_id bigint not null references public.brands (id) on delete cascade,
  showroom_id bigint not null references public.showrooms (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

create index if not exists conversation_messages_brand_showroom_idx
  on public.conversation_messages (brand_id, showroom_id, created_at);

alter table public.conversation_messages enable row level security;

-- Lecture : propriétaire de la marque ou du showroom
create policy "conversation_messages_select"
  on public.conversation_messages for select to authenticated
  using (
    exists (select 1 from public.brands b where b.id = conversation_messages.brand_id and b.owner_id = auth.uid())
    or exists (select 1 from public.showrooms s where s.id = conversation_messages.showroom_id and s.owner_id = auth.uid())
  );

-- Insertion : propriétaire de la marque ou du showroom (envoi depuis son côté)
create policy "conversation_messages_insert"
  on public.conversation_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and (
      exists (select 1 from public.brands b where b.id = conversation_messages.brand_id and b.owner_id = auth.uid())
      or exists (select 1 from public.showrooms s where s.id = conversation_messages.showroom_id and s.owner_id = auth.uid())
    )
  );
