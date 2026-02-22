-- Permettre à la marque et au showroom de supprimer des placements (demande synchronisée des deux côtés).
-- À exécuter dans Supabase → SQL Editor (après avoir créé la table placements avec product_id/showroom_id en bigint).

ALTER TABLE public.placements ENABLE ROW LEVEL SECURITY;

-- Marque : supprimer ses placements (retirer un produit de la demande)
DROP POLICY IF EXISTS "placements_delete_brand" ON public.placements;
CREATE POLICY "placements_delete_brand" ON public.placements
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = placements.product_id
      AND p.brand_id IN (SELECT id FROM public.brands WHERE owner_id = auth.uid())
    )
  );

-- Showroom : supprimer les placements de ses showrooms (rejeter la demande)
DROP POLICY IF EXISTS "placements_delete_showroom" ON public.placements;
CREATE POLICY "placements_delete_showroom" ON public.placements
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.showrooms s
      WHERE s.id = placements.showroom_id
      AND s.owner_id = auth.uid()
    )
  );

-- Si vos policies SELECT/INSERT/UPDATE n’existent pas encore, décommentez et adaptez les noms de colonnes si besoin :
-- (placements_select_brand, placements_insert_brand, placements_update_brand, placements_select_showroom, placements_update_showroom)
