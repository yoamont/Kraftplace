-- Corriger la FK products.brand_id : doit pointer vers brands(brand_id).
-- À exécuter dans Supabase → SQL Editor si vous avez l’erreur « violates foreign key constraint products_brand_id_fkey ».

-- 1) Supprimer l’ancienne contrainte
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_brand_id_fkey;

-- 2) Recréer la FK vers brands(brand_id)
-- (Si vous avez d’abord restructuré brands avec brand_id uuid + owner_id, exécutez supabase-brands-id-and-owner.sql
--  qui met à jour les products.brand_id avant de recréer la FK.)
ALTER TABLE products
  ADD CONSTRAINT products_brand_id_fkey
  FOREIGN KEY (brand_id) REFERENCES brands(brand_id);
