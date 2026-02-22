-- Étendre la table brands : description, image_url, default_commission_rate
-- À exécuter si vos marques n'ont que shop_name / name.

ALTER TABLE brands ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS default_commission_rate numeric(5,2) CHECK (default_commission_rate IS NULL OR (default_commission_rate >= 0 AND default_commission_rate <= 100));

-- Si votre table a "name" au lieu de "shop_name", ajoutez shop_name pour compatibilité :
-- ALTER TABLE brands ADD COLUMN IF NOT EXISTS shop_name text;
-- UPDATE brands SET shop_name = name WHERE shop_name IS NULL AND name IS NOT NULL;
