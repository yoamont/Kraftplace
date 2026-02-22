-- ============================================================
-- KraftPlace B2B Messaging: conversations + messages
-- Créateur = brand (marque), Boutique = showroom
-- ============================================================

-- Table des conversations (une par couple créateur/boutique)
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  brand_id bigint not null references public.brands(id) on delete cascade,
  showroom_id bigint not null references public.showrooms(id) on delete cascade,
  updated_at timestamptz not null default now(),
  unique(brand_id, showroom_id)
);

create index if not exists idx_conversations_brand_id on public.conversations(brand_id);
create index if not exists idx_conversations_showroom_id on public.conversations(showroom_id);
create index if not exists idx_conversations_updated_at on public.conversations(updated_at desc);

comment on table public.conversations is 'Une conversation par couple créateur (brand) / boutique (showroom).';

-- Table des messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_conversation_id on public.messages(conversation_id);
create index if not exists idx_messages_created_at on public.messages(conversation_id, created_at asc);

comment on table public.messages is 'Messages B2B entre un créateur (brand) et une boutique (showroom).';
comment on column public.messages.sender_id is 'auth.users.id de l’expéditeur (propriétaire brand ou showroom).';

-- Trigger: mettre à jour conversations.updated_at à chaque nouveau message
create or replace function public.set_conversation_updated_at()
returns trigger as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists messages_set_conversation_updated_at on public.messages;
create trigger messages_set_conversation_updated_at
  after insert on public.messages
  for each row execute function public.set_conversation_updated_at();

-- ============ RLS ============
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Conversations: visible si je suis le propriétaire du brand ou du showroom
create policy "conversations_select_own"
  on public.conversations for select
  using (
    exists (select 1 from public.brands b where b.id = conversations.brand_id and b.owner_id = auth.uid())
    or exists (select 1 from public.showrooms s where s.id = conversations.showroom_id and s.owner_id = auth.uid())
  );

create policy "conversations_insert_own"
  on public.conversations for insert
  with check (
    exists (select 1 from public.brands b where b.id = brand_id and b.owner_id = auth.uid())
    or exists (select 1 from public.showrooms s where s.id = showroom_id and s.owner_id = auth.uid())
  );

-- Messages: visible si la conversation m’appartient
create policy "messages_select_own"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
      and (
        exists (select 1 from public.brands b where b.id = c.brand_id and b.owner_id = auth.uid())
        or exists (select 1 from public.showrooms s where s.id = c.showroom_id and s.owner_id = auth.uid())
      )
    )
  );

create policy "messages_insert_own"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
      and (
        exists (select 1 from public.brands b where b.id = c.brand_id and b.owner_id = auth.uid())
        or exists (select 1 from public.showrooms s where s.id = c.showroom_id and s.owner_id = auth.uid())
      )
    )
  );

create policy "messages_update_read_own"
  on public.messages for update
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
      and (
        exists (select 1 from public.brands b where b.id = c.brand_id and b.owner_id = auth.uid())
        or exists (select 1 from public.showrooms s where s.id = c.showroom_id and s.owner_id = auth.uid())
      )
    )
  )
  with check (true);

-- Realtime: autoriser les abonnements sur messages pour les conversations accessibles
-- (RLS s’applique aux changements envoyés par Realtime)
-- Activer Realtime pour public.messages dans Database > Replication si besoin.
