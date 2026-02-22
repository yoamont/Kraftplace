-- Permettre à la marque et à la boutique de créer des demandes de paiement
-- avec uniquement counterpart_* (depuis la messagerie, sans placement/candidature).
-- Exécuter après supabase-payments-counterpart-direct.sql.

-- Assouplir la contrainte sales : placement_id OU counterpart
alter table public.payment_requests drop constraint if exists payment_requests_sales_placement;
alter table public.payment_requests add constraint payment_requests_sales_placement_or_counterpart
  check (type <> 'sales' or placement_id is not null or counterpart_brand_id is not null or counterpart_showroom_id is not null);

-- Marque : rent (je paie le loyer) ou sales (je demande à être payée) avec counterpart_showroom_id
drop policy if exists "payment_requests_insert_brand" on public.payment_requests;
create policy "payment_requests_insert_brand" on public.payment_requests
  for insert with check (
    initiator_side = 'brand'
    and (
      (type = 'rent' and (
        (candidature_id is not null and exists (select 1 from public.candidatures c where c.id = candidature_id and c.brand_id in (select id from public.brands where owner_id = auth.uid())))
        or (counterpart_showroom_id is not null and exists (select 1 from public.brands b where b.owner_id = auth.uid()))
      ))
      or
      (type = 'sales' and (
        (placement_id is not null and exists (select 1 from public.placements pl join public.products pr on pr.id = pl.product_id where pl.id = placement_id and pr.brand_id in (select id from public.brands where owner_id = auth.uid())))
        or (counterpart_showroom_id is not null and exists (select 1 from public.brands b where b.owner_id = auth.uid()))
      ))
    )
  );

-- Showroom : sales (je paie le créateur) avec counterpart_brand_id (depuis messagerie)
drop policy if exists "payment_requests_insert_showroom" on public.payment_requests;
create policy "payment_requests_insert_showroom" on public.payment_requests
  for insert with check (
    initiator_side = 'showroom'
    and (
      (type = 'sales' and (
        (placement_id is not null and exists (select 1 from public.placements pl where pl.id = placement_id and pl.showroom_id in (select id from public.showrooms where owner_id = auth.uid())))
        or (counterpart_brand_id is not null and exists (select 1 from public.showrooms s where s.owner_id = auth.uid()))
      ))
      or
      (type = 'rent' and (
        (candidature_id is not null and exists (select 1 from public.candidatures c where c.id = candidature_id and c.showroom_id in (select id from public.showrooms where owner_id = auth.uid())))
        or (counterpart_brand_id is not null and exists (select 1 from public.showrooms s where s.owner_id = auth.uid()))
      ))
    )
  );
