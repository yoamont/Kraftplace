-- Statut de publication des showrooms (boutiques).
-- Brouillon : personne ne voit la boutique.
-- Publié : les marques peuvent postuler (visible dans Mes revendeurs).
-- À exécuter dans Supabase → SQL Editor.

ALTER TABLE showrooms
  ADD COLUMN IF NOT EXISTS publication_status text NOT NULL DEFAULT 'draft'
  CHECK (publication_status IN ('draft', 'published'));

COMMENT ON COLUMN showrooms.publication_status IS 'draft = invisible, published = visible par les marques';

-- Les marques (tout utilisateur connecté) peuvent lire les showrooms publiés pour l’exploration.
DROP POLICY IF EXISTS "showrooms_select_published" ON showrooms;
CREATE POLICY "showrooms_select_published" ON showrooms
  FOR SELECT USING (publication_status = 'published');
