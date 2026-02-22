-- Un même compte peut créer plusieurs boutiques (showrooms) et plusieurs marques (brands).
-- À exécuter dans Supabase → SQL Editor.

-- 1) Plusieurs showrooms par utilisateur : supprimer l’unicité sur owner_id
DROP INDEX IF EXISTS showrooms_owner_id_key;

-- 2) Table des marques : un même utilisateur peut avoir plusieurs marques
CREATE TABLE IF NOT EXISTS brands (
  brand_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brands_owner_id_idx ON brands (owner_id);

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brands_select_own" ON brands;
CREATE POLICY "brands_select_own" ON brands
  FOR SELECT USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "brands_insert_own" ON brands;
CREATE POLICY "brands_insert_own" ON brands
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "brands_update_own" ON brands;
CREATE POLICY "brands_update_own" ON brands
  FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "brands_delete_own" ON brands;
CREATE POLICY "brands_delete_own" ON brands
  FOR DELETE USING (auth.uid() = owner_id);

-- Lecture publique des marques (pour afficher le nom sur les fiches produit)
DROP POLICY IF EXISTS "brands_select_public" ON brands;
CREATE POLICY "brands_select_public" ON brands
  FOR SELECT USING (true);

-- Mise à jour de updated_at
CREATE OR REPLACE FUNCTION set_brands_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS brands_updated_at ON brands;
CREATE TRIGGER brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION set_brands_updated_at();
