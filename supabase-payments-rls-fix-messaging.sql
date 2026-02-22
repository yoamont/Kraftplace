-- =============================================================================
-- FIX RLS : autoriser "Demander un paiement" depuis la messagerie (sans deal)
-- À exécuter dans Supabase → SQL Editor (une seule fois).
-- Prérequis : colonnes counterpart_brand_id / counterpart_showroom_id existent
--             (sinon exécuter avant : supabase-payments-counterpart-direct.sql)
-- =============================================================================

-- 1) Contrainte sales : accepter placement_id OU counterpart (pour type = sales)
ALTER TABLE public.payment_requests DROP CONSTRAINT IF EXISTS payment_requests_sales_placement;
ALTER TABLE public.payment_requests ADD CONSTRAINT payment_requests_sales_placement_or_counterpart
  CHECK (
    type <> 'sales'
    OR placement_id IS NOT NULL
    OR counterpart_brand_id IS NOT NULL
    OR counterpart_showroom_id IS NOT NULL
  );

-- 2) Marque : peut insérer rent (je paie le loyer) ou sales (je demande à être payée)
--    avec uniquement counterpart_showroom_id (conversation messagerie)
DROP POLICY IF EXISTS "payment_requests_insert_brand" ON public.payment_requests;
CREATE POLICY "payment_requests_insert_brand" ON public.payment_requests
  FOR INSERT
  WITH CHECK (
    initiator_side = 'brand'
    AND (
      ( type = 'rent' AND (
          (candidature_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.candidatures c
            WHERE c.id = candidature_id
              AND c.brand_id IN (SELECT id FROM public.brands WHERE owner_id = auth.uid())
          ))
          OR (counterpart_showroom_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.brands b WHERE b.owner_id = auth.uid()
          ))
        ))
      OR ( type = 'sales' AND (
          (placement_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.placements pl
            JOIN public.products pr ON pr.id = pl.product_id
            WHERE pl.id = placement_id
              AND pr.brand_id IN (SELECT id FROM public.brands WHERE owner_id = auth.uid())
          ))
          OR (counterpart_showroom_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.brands b WHERE b.owner_id = auth.uid()
          ))
        ))
    )
  );

-- 3) Showroom : peut insérer sales (je paie) ou rent (je demande le loyer)
--    avec uniquement counterpart_brand_id (conversation messagerie)
DROP POLICY IF EXISTS "payment_requests_insert_showroom" ON public.payment_requests;
CREATE POLICY "payment_requests_insert_showroom" ON public.payment_requests
  FOR INSERT
  WITH CHECK (
    initiator_side = 'showroom'
    AND (
      ( type = 'sales' AND (
          (placement_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.placements pl
            WHERE pl.id = placement_id
              AND pl.showroom_id IN (SELECT id FROM public.showrooms WHERE owner_id = auth.uid())
          ))
          OR (counterpart_brand_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.showrooms s WHERE s.owner_id = auth.uid()
          ))
        ))
      OR ( type = 'rent' AND (
          (candidature_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.candidatures c
            WHERE c.id = candidature_id
              AND c.showroom_id IN (SELECT id FROM public.showrooms WHERE owner_id = auth.uid())
          ))
          OR (counterpart_brand_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.showrooms s WHERE s.owner_id = auth.uid()
          ))
        ))
    )
  );
