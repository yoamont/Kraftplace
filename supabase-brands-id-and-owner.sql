-- Restructurer la table brands : id unique (uuid PK) + owner_id (référence utilisateur).
-- À exécuter dans Supabase → SQL Editor (table brands existante avec id = user id actuellement).

-- 1) Ajouter owner_id et copier l’ancien id (user id) dedans
ALTER TABLE brands ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
UPDATE brands SET owner_id = id WHERE owner_id IS NULL;

-- 2) Ajouter la future clé primaire (uuid)
ALTER TABLE brands ADD COLUMN IF NOT EXISTS id_new uuid DEFAULT gen_random_uuid() NOT NULL;

-- 3) Mettre à jour les produits AVANT de supprimer l’ancien id : brand_id = nouvel uuid
UPDATE products p
SET brand_id = (SELECT b.id_new FROM brands b WHERE b.owner_id = p.brand_id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM brands b WHERE b.owner_id = p.brand_id);

-- 4) Supprimer une éventuelle FK products.brand_id → brands (à adapter si le nom diffère)
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_brand_id_fkey;

-- 5) Supprimer l’ancienne PK et l’ancienne colonne id
ALTER TABLE brands DROP CONSTRAINT IF EXISTS brands_pkey;
ALTER TABLE brands DROP COLUMN id;

-- 6) Renommer id_new en id et en faire la PK
ALTER TABLE brands RENAME COLUMN id_new TO id;
ALTER TABLE brands ADD PRIMARY KEY (id);

-- 7) Rendre owner_id obligatoire
ALTER TABLE brands ALTER COLUMN owner_id SET NOT NULL;

-- 8) RLS : utiliser owner_id
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "brands_select_own" ON brands;
CREATE POLICY "brands_select_own" ON brands FOR SELECT USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "brands_update_own" ON brands;
CREATE POLICY "brands_update_own" ON brands FOR UPDATE USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "brands_insert_own" ON brands;
CREATE POLICY "brands_insert_own" ON brands FOR INSERT WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "brands_select_public" ON brands;
CREATE POLICY "brands_select_public" ON brands FOR SELECT USING (true);
