-- À exécuter APRÈS supabase-multiple-showrooms-and-brands.sql
-- Lie les produits à la table brands (une marque par utilisateur existant est créée).

-- 1) Créer une marque par utilisateur existant (à partir de profiles.shop_name si la table existe)
INSERT INTO brands (owner_id, name)
SELECT u.id, COALESCE((SELECT p.shop_name FROM profiles p WHERE p.id = u.id LIMIT 1), 'Ma marque')
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM brands b WHERE b.owner_id = u.id);

-- 2) Mettre à jour les produits : remplacer brand_id = user_id par brand_id = id de la marque de cet user
-- (Décommenter et adapter si votre table products a bien une colonne brand_id de type uuid)
/*
UPDATE products p
SET brand_id = (SELECT b.brand_id FROM brands b WHERE b.owner_id = p.brand_id LIMIT 1)
WHERE p.brand_id IN (SELECT id FROM auth.users);

ALTER TABLE products
  ADD CONSTRAINT products_brand_id_fkey
  FOREIGN KEY (brand_id) REFERENCES brands(brand_id);
*/
