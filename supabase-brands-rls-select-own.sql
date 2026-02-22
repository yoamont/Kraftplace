-- RLS sur la table brands (brand_id uuid PK, owner_id = user id).
-- À exécuter si la table a déjà brand_id + owner_id (après supabase-brands-id-and-owner.sql).

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brands_select_own" ON brands;
CREATE POLICY "brands_select_own" ON brands FOR SELECT USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "brands_update_own" ON brands;
CREATE POLICY "brands_update_own" ON brands FOR UPDATE USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "brands_insert_own" ON brands;
CREATE POLICY "brands_insert_own" ON brands FOR INSERT WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "brands_select_public" ON brands;
CREATE POLICY "brands_select_public" ON brands FOR SELECT USING (true);
