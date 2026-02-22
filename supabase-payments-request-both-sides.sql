-- Permettre aux deux parties de "demander un paiement" : marque peut demander à être payée (sales), showroom peut demander un loyer (rent).
-- Exécuter après supabase-payments.sql.

drop policy if exists "payment_requests_insert_brand" on public.payment_requests;
drop policy if exists "payment_requests_insert_showroom" on public.payment_requests;

-- Marque : créer une demande de type rent (je paie le loyer) OU de type sales (je demande à être payée)
create policy "payment_requests_insert_brand" on public.payment_requests
  for insert with check (
    initiator_side = 'brand'
    and (
      (type = 'rent' and candidature_id is not null and exists (select 1 from public.candidatures c where c.id = candidature_id and c.brand_id in (select id from public.brands where owner_id = auth.uid())))
      or
      (type = 'sales' and placement_id is not null and exists (select 1 from public.placements pl join public.products pr on pr.id = pl.product_id where pl.id = placement_id and pr.brand_id in (select id from public.brands where owner_id = auth.uid())))
    )
  );

-- Showroom : créer une demande de type sales (je paie le créateur) OU de type rent (je demande le loyer)
create policy "payment_requests_insert_showroom" on public.payment_requests
  for insert with check (
    initiator_side = 'showroom'
    and (
      (type = 'sales' and placement_id is not null and exists (select 1 from public.placements pl where pl.id = placement_id and pl.showroom_id in (select id from public.showrooms where owner_id = auth.uid())))
      or
      (type = 'rent' and candidature_id is not null and exists (select 1 from public.candidatures c where c.id = candidature_id and c.showroom_id in (select id from public.showrooms where owner_id = auth.uid())))
    )
  );
