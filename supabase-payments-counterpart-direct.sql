-- Paiements sans deal : permettre d'initier un paiement avec n'importe quelle marque/boutique (counterpart).
-- Exécuter après supabase-payments.sql et supabase-payments-request-both-sides.sql.

-- Colonnes pour identifier la contrepartie quand il n'y a pas de candidature/placement
alter table public.payment_requests
  add column if not exists counterpart_brand_id bigint null references public.brands (id) on delete set null,
  add column if not exists counterpart_showroom_id bigint null references public.showrooms (id) on delete set null;

comment on column public.payment_requests.counterpart_brand_id is 'Marque concernée (quand type=rent et candidature_id absent, ex. boutique demande loyer à cette marque)';
comment on column public.payment_requests.counterpart_showroom_id is 'Boutique concernée (quand type=rent et candidature_id absent, ex. marque paie loyer à cette boutique)';

-- Assouplir la contrainte rent : candidature_id OU counterpart
alter table public.payment_requests drop constraint if exists payment_requests_rent_candidature;
alter table public.payment_requests add constraint payment_requests_rent_candidature_or_counterpart
  check (type <> 'rent' or candidature_id is not null or counterpart_brand_id is not null or counterpart_showroom_id is not null);

create index if not exists payment_requests_counterpart_brand_id_idx on public.payment_requests (counterpart_brand_id);
create index if not exists payment_requests_counterpart_showroom_id_idx on public.payment_requests (counterpart_showroom_id);

-- Marque : voir aussi les demandes où elle est la contrepartie (counterpart_brand_id)
drop policy if exists "payment_requests_select_brand" on public.payment_requests;
create policy "payment_requests_select_brand" on public.payment_requests
  for select using (
    (placement_id is not null and exists (
      select 1 from public.placements pl join public.products pr on pr.id = pl.product_id
      where pl.id = payment_requests.placement_id and pr.brand_id in (select id from public.brands where owner_id = auth.uid())
    ))
    or (candidature_id is not null and exists (
      select 1 from public.candidatures c where c.id = payment_requests.candidature_id and c.brand_id in (select id from public.brands where owner_id = auth.uid())
    ))
    or (counterpart_brand_id is not null and counterpart_brand_id in (select id from public.brands where owner_id = auth.uid()))
  );

-- Showroom : voir aussi les demandes où il est la contrepartie (counterpart_showroom_id)
drop policy if exists "payment_requests_select_showroom" on public.payment_requests;
create policy "payment_requests_select_showroom" on public.payment_requests
  for select using (
    (placement_id is not null and exists (
      select 1 from public.placements pl where pl.id = payment_requests.placement_id and pl.showroom_id in (select id from public.showrooms where owner_id = auth.uid())
    ))
    or (candidature_id is not null and exists (
      select 1 from public.candidatures c where c.id = payment_requests.candidature_id and c.showroom_id in (select id from public.showrooms where owner_id = auth.uid())
    ))
    or (counterpart_showroom_id is not null and counterpart_showroom_id in (select id from public.showrooms where owner_id = auth.uid()))
  );

-- Showroom : peut créer une demande rent sans candidature (counterpart_brand_id = marque à qui demander le loyer)
drop policy if exists "payment_requests_insert_showroom" on public.payment_requests;
create policy "payment_requests_insert_showroom" on public.payment_requests
  for insert with check (
    initiator_side = 'showroom'
    and (
      (type = 'sales' and placement_id is not null and exists (select 1 from public.placements pl where pl.id = placement_id and pl.showroom_id in (select id from public.showrooms where owner_id = auth.uid())))
      or
      (type = 'rent' and (
        (candidature_id is not null and exists (select 1 from public.candidatures c where c.id = candidature_id and c.showroom_id in (select id from public.showrooms where owner_id = auth.uid())))
        or (counterpart_brand_id is not null and exists (select 1 from public.showrooms s where s.owner_id = auth.uid()))
      ))
    )
  );

-- Marque : update doit inclure les lignes où elle est contrepartie
drop policy if exists "payment_requests_update_brand" on public.payment_requests;
create policy "payment_requests_update_brand" on public.payment_requests
  for update using (
    (placement_id is not null and exists (select 1 from public.placements pl join public.products pr on pr.id = pl.product_id where pl.id = payment_requests.placement_id and pr.brand_id in (select id from public.brands where owner_id = auth.uid())))
    or (candidature_id is not null and exists (select 1 from public.candidatures c where c.id = payment_requests.candidature_id and c.brand_id in (select id from public.brands where owner_id = auth.uid())))
    or (counterpart_brand_id is not null and counterpart_brand_id in (select id from public.brands where owner_id = auth.uid()))
  );

-- Showroom : update doit inclure les lignes où il est contrepartie
drop policy if exists "payment_requests_update_showroom" on public.payment_requests;
create policy "payment_requests_update_showroom" on public.payment_requests
  for update using (
    (placement_id is not null and exists (select 1 from public.placements pl where pl.id = payment_requests.placement_id and pl.showroom_id in (select id from public.showrooms where owner_id = auth.uid())))
    or (candidature_id is not null and exists (select 1 from public.candidatures c where c.id = payment_requests.candidature_id and c.showroom_id in (select id from public.showrooms where owner_id = auth.uid())))
    or (counterpart_showroom_id is not null and counterpart_showroom_id in (select id from public.showrooms where owner_id = auth.uid()))
  );
