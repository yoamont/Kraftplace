-- Table showrooms pour la config showroom (admin).
-- À exécuter dans Supabase → SQL Editor.

CREATE TABLE IF NOT EXISTS showrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  address text,
  city text,
  code_postal text,
  description text,
  default_commission_rate numeric(5,2) CHECK (default_commission_rate >= 0 AND default_commission_rate <= 100),
  image_url text,
  instagram_handle text,
  is_permanent boolean DEFAULT true,
  start_date date,
  end_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Un seul showroom par utilisateur (optionnel)
CREATE UNIQUE INDEX IF NOT EXISTS showrooms_owner_id_key ON showrooms (owner_id);

-- RLS : l’utilisateur ne voit et ne modifie que sa propre ligne (owner_id = auth.uid())
ALTER TABLE showrooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "showrooms_select_own" ON showrooms;
CREATE POLICY "showrooms_select_own" ON showrooms
  FOR SELECT USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "showrooms_insert_own" ON showrooms;
CREATE POLICY "showrooms_insert_own" ON showrooms
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "showrooms_update_own" ON showrooms;
CREATE POLICY "showrooms_update_own" ON showrooms
  FOR UPDATE USING (auth.uid() = owner_id);

-- Remplir owner_id automatiquement à l’insertion (auth.uid())
CREATE OR REPLACE FUNCTION set_showroom_owner_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.owner_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS showrooms_set_owner ON showrooms;
CREATE TRIGGER showrooms_set_owner
  BEFORE INSERT ON showrooms
  FOR EACH ROW EXECUTE FUNCTION set_showroom_owner_id();

-- Mettre à jour updated_at à chaque modification
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS showrooms_updated_at ON showrooms;
CREATE TRIGGER showrooms_updated_at
  BEFORE UPDATE ON showrooms
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
