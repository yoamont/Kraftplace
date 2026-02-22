-- Un même owner ne peut pas avoir deux marques avec le même brand_name.
-- À exécuter dans Supabase → SQL Editor.

-- 1) En cas de doublons existants : garder une seule marque par (owner_id, brand_name)
-- Décommenter et exécuter une seule fois si vous avez déjà des doublons, puis exécuter le bloc 2.
/*
DELETE FROM brands a
USING brands b
WHERE a.ctid < b.ctid
  AND a.owner_id = b.owner_id
  AND TRIM(LOWER(COALESCE(a.brand_name, ''))) = TRIM(LOWER(COALESCE(b.brand_name, '')))
  AND TRIM(COALESCE(a.brand_name, '')) <> '';
*/

-- 2) Contrainte d'unicité : un owner ne peut pas créer deux marques avec le même nom (insensible à la casse)
CREATE UNIQUE INDEX IF NOT EXISTS brands_owner_id_brand_name_key
  ON brands (owner_id, LOWER(TRIM(brand_name)))
  WHERE brand_name IS NOT NULL AND TRIM(brand_name) <> '';
