-- Évolution des candidatures : validité 7/14 j, expiration, actions demandeur/receveur, messages pour négocier.

-- Colonnes validité et statuts étendus
alter table public.candidatures
  add column if not exists expires_at timestamp with time zone null,
  add column if not exists validity_days smallint null,
  add column if not exists updated_at timestamp with time zone null default timezone('utc'::text, now());

alter table public.candidatures
  drop constraint if exists candidatures_status_check;

alter table public.candidatures
  add constraint candidatures_status_check check (
    status in ('pending', 'accepted', 'declined', 'cancelled', 'expired')
  );

alter table public.candidatures
  drop constraint if exists candidatures_validity_days_check,
  add constraint candidatures_validity_days_check check (
    validity_days is null or (validity_days in (7, 14))
  );

-- Messages sur une candidature (négociation)
create table if not exists public.candidature_messages (
  id uuid not null default gen_random_uuid(),
  candidature_id uuid not null,
  sender_id uuid not null,
  body text not null,
  created_at timestamp with time zone null default timezone('utc'::text, now()),
  constraint candidature_messages_pkey primary key (id),
  constraint candidature_messages_candidature_id_fkey foreign key (candidature_id) references public.candidatures (id) on delete cascade,
  constraint candidature_messages_sender_id_fkey foreign key (sender_id) references auth.users (id) on delete cascade
);

create index if not exists candidature_messages_candidature_id_idx on public.candidature_messages using btree (candidature_id);

alter table public.candidature_messages enable row level security;

-- Supprimer toutes les policies existantes pour pouvoir les recréer (script réexécutable)
drop policy if exists "candidature_messages_select_brand" on public.candidature_messages;
drop policy if exists "candidature_messages_insert_brand" on public.candidature_messages;
drop policy if exists "candidature_messages_select_showroom" on public.candidature_messages;
drop policy if exists "candidature_messages_insert_showroom" on public.candidature_messages;
drop policy if exists "candidatures_update_brand" on public.candidatures;
drop policy if exists "candidatures_delete_brand" on public.candidatures;
drop policy if exists "candidatures_update_showroom" on public.candidatures;

-- Marque : voir/écrire messages des candidatures qu'elle a envoyées
create policy "candidature_messages_select_brand" on public.candidature_messages
  for select using (
    exists (
      select 1 from public.candidatures c
      join public.brands b on b.id = c.brand_id and b.owner_id = auth.uid()
      where c.id = candidature_messages.candidature_id
    )
  );

create policy "candidature_messages_insert_brand" on public.candidature_messages
  for insert with check (
    exists (
      select 1 from public.candidatures c
      join public.brands b on b.id = c.brand_id and b.owner_id = auth.uid()
      where c.id = candidature_messages.candidature_id
    )
  );

-- Showroom : voir/écrire messages des candidatures reçues
create policy "candidature_messages_select_showroom" on public.candidature_messages
  for select using (
    exists (
      select 1 from public.candidatures c
      join public.showrooms s on s.id = c.showroom_id and s.owner_id = auth.uid()
      where c.id = candidature_messages.candidature_id
    )
  );

create policy "candidature_messages_insert_showroom" on public.candidature_messages
  for insert with check (
    exists (
      select 1 from public.candidatures c
      join public.showrooms s on s.id = c.showroom_id and s.owner_id = auth.uid()
      where c.id = candidature_messages.candidature_id
    )
  );

-- Marque : modifier ou annuler sa candidature (pending uniquement)
create policy "candidatures_update_brand" on public.candidatures
  for update using (
    brand_id in (select id from public.brands where owner_id = auth.uid())
  );

create policy "candidatures_delete_brand" on public.candidatures
  for delete using (
    brand_id in (select id from public.brands where owner_id = auth.uid())
  );

-- Showroom : accepter ou refuser (update status)
create policy "candidatures_update_showroom" on public.candidatures
  for update using (
    showroom_id in (select id from public.showrooms where owner_id = auth.uid())
  );

-- Fonction pour expirer les candidatures dépassées (à appeler au chargement des listes)
create or replace function public.expire_pending_candidatures()
returns void
language sql
security definer
set search_path = public
as $$
  update public.candidatures
  set status = 'expired'
  where status = 'pending'
    and expires_at is not null
    and expires_at < timezone('utc', now());
$$;

-- Grant execute to anon/authenticated so the app can call it
grant execute on function public.expire_pending_candidatures() to anon;
grant execute on function public.expire_pending_candidatures() to authenticated;

-- Mettre à jour updated_at à chaque modification
create or replace function public.set_candidatures_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists candidatures_updated_at on public.candidatures;
create trigger candidatures_updated_at
  before update on public.candidatures
  for each row execute function public.set_candidatures_updated_at();
