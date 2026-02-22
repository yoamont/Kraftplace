-- Notifications pour les mises à jour sur placements et candidatures.

create table if not exists public.notifications (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  type text not null,
  reference_id text null,
  title text not null,
  body text null,
  read boolean not null default false,
  created_at timestamp with time zone null default timezone('utc'::text, now()),
  constraint notifications_pkey primary key (id),
  constraint notifications_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
);

create index if not exists notifications_user_id_idx on public.notifications using btree (user_id);
create index if not exists notifications_read_idx on public.notifications using btree (read);
create index if not exists notifications_created_at_idx on public.notifications using btree (created_at desc);

alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select using (user_id = auth.uid());

create policy "notifications_update_own" on public.notifications
  for update using (user_id = auth.uid());

-- L'insert se fait côté app (ou via trigger) : le destinataire reçoit la notification.
-- On peut permettre à un service role ou à l'app d'insérer pour user_id = n'importe quel utilisateur
-- en utilisant une policy avec check (true) pour insert si on appelle depuis un trigger avec security definer.
-- Pour l'instant on insère depuis l'app : il faut que l'utilisateur connecté puisse créer une notification
-- pour un autre user_id. Donc on n'autorise pas l'insert via RLS pour un autre user - on fera l'insert
-- depuis le client après une action (ex: j'envoie un message -> je crée une notification pour l'autre).
-- Problème : si la marque envoie un message, c'est la marque qui est connectée, pas le showroom.
-- Donc la marque ne peut pas insérer une ligne avec user_id = showroom.owner_id (car RLS vérifierait
-- user_id = auth.uid()). Il nous faut soit un trigger en security definer, soit une edge function.
-- Solution simple : trigger sur placement_messages et candidature_messages (after insert) qui insère
-- une notification pour le destinataire. Le trigger s'exécute en tant que table owner, donc bypass RLS
-- si on utilise security definer.

-- Fonction trigger : après insert sur placement_messages, notifier le destinataire
create or replace function public.notify_placement_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_placement_id uuid;
  v_showroom_id bigint;
  v_product_id bigint;
  v_brand_owner_id uuid;
  v_showroom_owner_id uuid;
  v_recipient_id uuid;
  v_body_preview text;
begin
  select showroom_id, product_id into v_showroom_id, v_product_id
  from placements where id = new.placement_id;
  select owner_id into v_brand_owner_id from products p join brands b on b.id = p.brand_id where p.id = v_product_id;
  select owner_id into v_showroom_owner_id from showrooms where id = v_showroom_id;
  v_body_preview := left(new.body, 120);
  if length(new.body) > 120 then v_body_preview := v_body_preview || '…'; end if;
  if new.sender_id = v_brand_owner_id then
    v_recipient_id := v_showroom_owner_id;
  else
    v_recipient_id := v_brand_owner_id;
  end if;
  if v_recipient_id is not null then
    insert into notifications (user_id, type, reference_id, title, body, read)
    values (v_recipient_id, 'placement_message', new.placement_id::text, 'Nouveau message sur une demande', v_body_preview, false);
  end if;
  return new;
end;
$$;

drop trigger if exists placement_messages_notify on public.placement_messages;
create trigger placement_messages_notify
  after insert on public.placement_messages
  for each row execute function public.notify_placement_message();

-- Fonction trigger : après insert sur candidature_messages, notifier le destinataire
create or replace function public.notify_candidature_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_brand_owner_id uuid;
  v_showroom_owner_id uuid;
  v_recipient_id uuid;
  v_body_preview text;
begin
  select b.owner_id into v_brand_owner_id from candidatures c join brands b on b.id = c.brand_id where c.id = new.candidature_id;
  select s.owner_id into v_showroom_owner_id from candidatures c join showrooms s on s.id = c.showroom_id where c.id = new.candidature_id;
  v_body_preview := left(new.body, 120);
  if length(new.body) > 120 then v_body_preview := v_body_preview || '…'; end if;
  if new.sender_id = v_brand_owner_id then
    v_recipient_id := v_showroom_owner_id;
  else
    v_recipient_id := v_brand_owner_id;
  end if;
  if v_recipient_id is not null then
    insert into notifications (user_id, type, reference_id, title, body, read)
    values (v_recipient_id, 'candidature_message', new.candidature_id::text, 'Nouveau message sur une candidature', v_body_preview, false);
  end if;
  return new;
end;
$$;

drop trigger if exists candidature_messages_notify on public.candidature_messages;
create trigger candidature_messages_notify
  after insert on public.candidature_messages
  for each row execute function public.notify_candidature_message();

-- Notifications pour acceptation / refus (optionnel : on peut les ajouter depuis l'app au moment du update)
-- Pour simplifier, on n'ajoute pas de trigger sur placements (status change) ni sur candidatures (status change).
-- L'app peut appeler une RPC insert_notification(user_id, type, reference_id, title, body) en security definer
-- après un accept/refuse. Pour l'instant on ne fait que les messages.
-- Si besoin plus tard : créer une RPC et l'appeler depuis le front après accept/refuse.
