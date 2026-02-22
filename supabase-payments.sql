-- Paiements : demandes de paiement (ventes par la boutique, loyer par la marque), pièce jointe rapport de ventes, commission plateforme 2%.
-- À exécuter dans Supabase → SQL Editor.
--
-- Prérequis : bucket Storage "payment-attachments" (créer dans Dashboard si besoin, public ou privé selon besoin).

-- Table des demandes de paiement
create table if not exists public.payment_requests (
  id uuid not null default gen_random_uuid(),
  type text not null check (type in ('sales', 'rent')),
  placement_id uuid null,
  candidature_id uuid null,
  amount_cents bigint not null check (amount_cents > 0),
  platform_fee_cents bigint not null check (platform_fee_cents >= 0),
  currency text not null default 'eur',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'contested', 'completed', 'cancelled')),
  initiator_side text not null check (initiator_side in ('showroom', 'brand')),
  motif text null,
  sales_report_attachment_url text null,
  contest_note text null,
  stripe_payment_intent_id text null,
  stripe_platform_payment_intent_id text null,
  created_at timestamptz null default timezone('utc'::text, now()),
  updated_at timestamptz null default timezone('utc'::text, now()),
  constraint payment_requests_pkey primary key (id),
  constraint payment_requests_placement_fkey foreign key (placement_id) references public.placements (id) on delete set null,
  constraint payment_requests_candidature_fkey foreign key (candidature_id) references public.candidatures (id) on delete set null,
  constraint payment_requests_sales_placement check (type <> 'sales' or placement_id is not null),
  constraint payment_requests_rent_candidature check (type <> 'rent' or candidature_id is not null)
);

create index if not exists payment_requests_placement_id_idx on public.payment_requests (placement_id);
create index if not exists payment_requests_candidature_id_idx on public.payment_requests (candidature_id);
create index if not exists payment_requests_status_idx on public.payment_requests (status);
create index if not exists payment_requests_created_at_idx on public.payment_requests (created_at desc);

alter table public.payment_requests enable row level security;

-- Marque : voir les demandes où elle est concernée (placement → product → brand, ou candidature → brand)
create policy "payment_requests_select_brand" on public.payment_requests
  for select using (
    (placement_id is not null and exists (
      select 1 from public.placements pl
      join public.products pr on pr.id = pl.product_id
      where pl.id = payment_requests.placement_id and pr.brand_id in (select id from public.brands where owner_id = auth.uid())
    ))
    or
    (candidature_id is not null and exists (
      select 1 from public.candidatures c where c.id = payment_requests.candidature_id and c.brand_id in (select id from public.brands where owner_id = auth.uid())
    ))
  );

-- Showroom : voir les demandes où il est concerné (placement → showroom, ou candidature → showroom)
create policy "payment_requests_select_showroom" on public.payment_requests
  for select using (
    (placement_id is not null and exists (
      select 1 from public.placements pl where pl.id = payment_requests.placement_id and pl.showroom_id in (select id from public.showrooms where owner_id = auth.uid())
    ))
    or
    (candidature_id is not null and exists (
      select 1 from public.candidatures c where c.id = payment_requests.candidature_id and c.showroom_id in (select id from public.showrooms where owner_id = auth.uid())
    ))
  );

-- Marque : créer une demande de type rent (loyer), mettre à jour pour accepter/contester une demande sales
create policy "payment_requests_insert_brand" on public.payment_requests
  for insert with check (
    initiator_side = 'brand'
    and type = 'rent'
    and candidature_id is not null
    and exists (select 1 from public.candidatures c where c.id = candidature_id and c.brand_id in (select id from public.brands where owner_id = auth.uid()))
  );

create policy "payment_requests_update_brand" on public.payment_requests
  for update using (
    (placement_id is not null and exists (
      select 1 from public.placements pl join public.products pr on pr.id = pl.product_id
      where pl.id = payment_requests.placement_id and pr.brand_id in (select id from public.brands where owner_id = auth.uid())
    ))
    or
    (candidature_id is not null and exists (
      select 1 from public.candidatures c where c.id = payment_requests.candidature_id and c.brand_id in (select id from public.brands where owner_id = auth.uid())
    ))
  );

-- Showroom : créer une demande de type sales, mettre à jour pour accepter une demande rent
create policy "payment_requests_insert_showroom" on public.payment_requests
  for insert with check (
    initiator_side = 'showroom'
    and type = 'sales'
    and placement_id is not null
    and exists (select 1 from public.placements pl where pl.id = placement_id and pl.showroom_id in (select id from public.showrooms where owner_id = auth.uid()))
  );

create policy "payment_requests_update_showroom" on public.payment_requests
  for update using (
    (placement_id is not null and exists (
      select 1 from public.placements pl where pl.id = payment_requests.placement_id and pl.showroom_id in (select id from public.showrooms where owner_id = auth.uid())
    ))
    or
    (candidature_id is not null and exists (
      select 1 from public.candidatures c where c.id = payment_requests.candidature_id and c.showroom_id in (select id from public.showrooms where owner_id = auth.uid())
    ))
  );

-- Trigger updated_at
create or replace function public.set_payment_requests_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;
drop trigger if exists payment_requests_updated_at on public.payment_requests;
create trigger payment_requests_updated_at
  before update on public.payment_requests
  for each row execute function public.set_payment_requests_updated_at();
