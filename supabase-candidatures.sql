-- Candidatures marque → showroom (sans produits à ce stade).
-- La marque choisit une option de rémunération ou propose une négociation.

create table public.candidatures (
  id uuid not null default gen_random_uuid(),
  brand_id bigint not null,
  showroom_id bigint not null,
  showroom_commission_option_id bigint null,
  negotiation_message text null,
  message text null,
  status text not null default 'pending',
  created_at timestamp with time zone null default timezone('utc'::text, now()),
  constraint candidatures_pkey primary key (id),
  constraint candidatures_brand_id_fkey foreign key (brand_id) references public.brands (id) on delete cascade,
  constraint candidatures_showroom_id_fkey foreign key (showroom_id) references public.showrooms (id) on delete cascade,
  constraint candidatures_showroom_commission_option_id_fkey foreign key (showroom_commission_option_id) references public.showroom_commission_options (id) on delete set null,
  constraint candidatures_status_check check (status in ('pending', 'accepted', 'declined'))
);

create index candidatures_brand_id_idx on public.candidatures using btree (brand_id);
create index candidatures_showroom_id_idx on public.candidatures using btree (showroom_id);
create index candidatures_status_idx on public.candidatures using btree (status);

alter table public.candidatures enable row level security;

-- Marque : voir et créer ses candidatures
create policy "candidatures_select_brand" on public.candidatures
  for select using (
    brand_id in (select id from public.brands where owner_id = auth.uid())
  );

create policy "candidatures_insert_brand" on public.candidatures
  for insert with check (
    brand_id in (select id from public.brands where owner_id = auth.uid())
  );

-- Showroom : voir les candidatures reçues
create policy "candidatures_select_showroom" on public.candidatures
  for select using (
    showroom_id in (select id from public.showrooms where owner_id = auth.uid())
  );
