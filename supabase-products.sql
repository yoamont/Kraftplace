-- Table des produits showroom (à exécuter dans l’éditeur SQL Supabase)

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  variant_title TEXT,
  brand TEXT NOT NULL,
  image_url TEXT NOT NULL,
  price_eur NUMERIC(10,2) NOT NULL,
  description TEXT NOT NULL,
  rating NUMERIC(2,1) DEFAULT 5,
  review_count INTEGER DEFAULT 0,
  level TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Politique d’accès : lecture publique pour tous
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture publique des produits"
  ON products FOR SELECT
  USING (true);

-- Exemple : produit Kit Roller flower (Mellow Paris)
INSERT INTO products (
  id,
  title,
  variant_title,
  brand,
  image_url,
  price_eur,
  description,
  rating,
  review_count,
  level
) VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Kit de broderie Roller flower',
  'Motif + Tambour 12 cm + Fils DMC + Aiguille',
  'By Mellow Paris',
  'https://cdn.shopify.com/s/files/1/0876/0128/3415/files/photocontenurollerflowerkitcercle.png?v=1740739470',
  39.90,
  'Plonge dans une ambiance rétro avec le motif Roller Flower, inspiré des années 90. Colle, brode, rince et porte fièrement ta broderie sur tote-bag, veste jean ou t-shirt. ~15 h • 10 × 12 cm. Guide FR/EN et tutoriels vidéo inclus.',
  5,
  8,
  'Niveau intermédiaire'
)
ON CONFLICT (id) DO NOTHING;
