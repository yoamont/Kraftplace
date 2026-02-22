-- Placements (deals entre marque et showroom) + messages
-- À exécuter dans Supabase → SQL Editor.

-- 1) Table placements : lien produit / showroom avec statut et stock
CREATE TABLE IF NOT EXISTS placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  showroom_id uuid NOT NULL REFERENCES showrooms(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'sold')),
  quantity_placed integer NOT NULL DEFAULT 0 CHECK (quantity_placed >= 0),
  quantity_sold integer NOT NULL DEFAULT 0 CHECK (quantity_sold >= 0),
  agreed_commission_percent numeric(5,2) CHECK (agreed_commission_percent IS NULL OR (agreed_commission_percent >= 0 AND agreed_commission_percent <= 100)),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, showroom_id)
);

CREATE INDEX IF NOT EXISTS placements_product_id_idx ON placements (product_id);
CREATE INDEX IF NOT EXISTS placements_showroom_id_idx ON placements (showroom_id);
CREATE INDEX IF NOT EXISTS placements_status_idx ON placements (status);

ALTER TABLE placements ENABLE ROW LEVEL SECURITY;

-- Marque : voir ses placements (via products.brand_id → brands.id)
CREATE POLICY "placements_select_brand" ON placements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM products p WHERE p.id = placements.product_id AND p.brand_id IN (SELECT id FROM brands WHERE owner_id = auth.uid()))
  );

-- Showroom : voir les placements de ses showrooms
CREATE POLICY "placements_select_showroom" ON placements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM showrooms s WHERE s.id = placements.showroom_id AND s.owner_id = auth.uid())
  );

-- Marque : insérer (candidature) pour ses produits
CREATE POLICY "placements_insert_brand" ON placements
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.brand_id IN (SELECT id FROM brands WHERE owner_id = auth.uid()))
  );

-- Marque : mettre à jour ses placements (négociation)
CREATE POLICY "placements_update_brand" ON placements
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM products p WHERE p.id = placements.product_id AND p.brand_id IN (SELECT id FROM brands WHERE owner_id = auth.uid()))
  );

-- Showroom : mettre à jour (accepter, stock, vente)
CREATE POLICY "placements_update_showroom" ON placements
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM showrooms s WHERE s.id = placements.showroom_id AND s.owner_id = auth.uid())
  );

-- 2) Table placement_messages : messages liés à un placement (négociation commission)
CREATE TABLE IF NOT EXISTS placement_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id uuid NOT NULL REFERENCES placements(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS placement_messages_placement_id_idx ON placement_messages (placement_id);

ALTER TABLE placement_messages ENABLE ROW LEVEL SECURITY;

-- Lire les messages si on a accès au placement (marque ou showroom)
CREATE POLICY "placement_messages_select" ON placement_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM placements pl
      JOIN products p ON p.id = pl.product_id
      JOIN brands b ON b.id = p.brand_id
      WHERE pl.id = placement_messages.placement_id AND b.owner_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM placements pl
      JOIN showrooms s ON s.id = pl.showroom_id
      WHERE pl.id = placement_messages.placement_id AND s.owner_id = auth.uid())
  );

-- Envoyer un message si on a accès au placement
CREATE POLICY "placement_messages_insert" ON placement_messages
  FOR INSERT WITH CHECK (sender_id = auth.uid() AND (
    EXISTS (SELECT 1 FROM placements pl JOIN products p ON p.id = pl.product_id JOIN brands b ON b.id = p.brand_id WHERE pl.id = placement_id AND b.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM placements pl JOIN showrooms s ON s.id = pl.showroom_id WHERE pl.id = placement_id AND s.owner_id = auth.uid())
  ));

-- Trigger updated_at sur placements
CREATE OR REPLACE FUNCTION set_placements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS placements_updated_at ON placements;
CREATE TRIGGER placements_updated_at
  BEFORE UPDATE ON placements
  FOR EACH ROW EXECUTE FUNCTION set_placements_updated_at();
