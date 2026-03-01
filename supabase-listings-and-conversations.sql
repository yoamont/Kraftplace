-- ============================================================
-- Restructuration Multi-Listings & Sessions de vente
-- 1) Table listings (annonces de partenariat par boutique)
-- 2) Une seule annonce publiée par boutique à la fois (trigger)
-- 3) Lier conversations à un listing_id pour filtrer par session
-- ============================================================

-- ---------- 1) Table listings ----------
CREATE TABLE IF NOT EXISTS public.listings (
  id bigserial PRIMARY KEY,
  showroom_id bigint NOT NULL REFERENCES public.showrooms(id) ON DELETE CASCADE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  partnership_start_date date,
  partnership_end_date date,
  application_open_date date,
  application_close_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listings_showroom_id ON public.listings(showroom_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(showroom_id, status);

COMMENT ON TABLE public.listings IS 'Annonces de partenariat (sessions de vente). Une seule peut être published par boutique à la fois.';
COMMENT ON COLUMN public.listings.partnership_start_date IS 'Début de la période de partenariat pour cette session.';
COMMENT ON COLUMN public.listings.partnership_end_date IS 'Fin de la période de partenariat pour cette session.';
COMMENT ON COLUMN public.listings.application_open_date IS 'Ouverture des candidatures pour cette annonce.';
COMMENT ON COLUMN public.listings.application_close_date IS 'Clôture des candidatures pour cette annonce.';

-- ---------- 2) Contrainte : une seule annonce published par boutique ----------
CREATE OR REPLACE FUNCTION public.ensure_single_published_listing_per_showroom()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'published' THEN
    UPDATE public.listings
    SET status = 'draft', updated_at = now()
    WHERE showroom_id = NEW.showroom_id
      AND id <> NEW.id
      AND status = 'published';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS listings_single_published ON public.listings;
CREATE TRIGGER listings_single_published
  AFTER INSERT OR UPDATE OF status ON public.listings
  FOR EACH ROW
  WHEN (NEW.status = 'published')
  EXECUTE FUNCTION public.ensure_single_published_listing_per_showroom();

-- ---------- 3) RLS listings ----------
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Sélection : propriétaire de la boutique OU listing publié (Discover marque)
CREATE POLICY "listings_select_own_or_published"
  ON public.listings FOR SELECT
  USING (
    showroom_id IN (SELECT id FROM public.showrooms WHERE owner_id = auth.uid())
    OR status = 'published'
  );

CREATE POLICY "listings_insert_own"
  ON public.listings FOR INSERT
  WITH CHECK (
    showroom_id IN (SELECT id FROM public.showrooms WHERE owner_id = auth.uid())
  );

CREATE POLICY "listings_update_own"
  ON public.listings FOR UPDATE
  USING (
    showroom_id IN (SELECT id FROM public.showrooms WHERE owner_id = auth.uid())
  );

CREATE POLICY "listings_delete_own"
  ON public.listings FOR DELETE
  USING (
    showroom_id IN (SELECT id FROM public.showrooms WHERE owner_id = auth.uid())
  );

-- ---------- 4) Ajouter listing_id aux conversations ----------
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS listing_id bigint REFERENCES public.listings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_listing_id ON public.conversations(listing_id);

-- Supprimer l'ancienne contrainte unique (brand_id, showroom_id) si elle existe
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_brand_id_showroom_id_key;

-- Un seul fil par (brand, showroom) quand listing_id est NULL (legacy)
CREATE UNIQUE INDEX IF NOT EXISTS conversations_brand_showroom_null_listing
  ON public.conversations (brand_id, showroom_id) WHERE listing_id IS NULL;

-- Un seul fil par (brand, showroom, listing) quand listing_id est renseigné
CREATE UNIQUE INDEX IF NOT EXISTS conversations_brand_showroom_listing_unique
  ON public.conversations (brand_id, showroom_id, listing_id) WHERE listing_id IS NOT NULL;

COMMENT ON COLUMN public.conversations.listing_id IS 'Annonce (session) concernée. NULL = conversation historique sans listing.';

-- Trigger updated_at sur listings
CREATE OR REPLACE FUNCTION public.set_listings_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS listings_updated_at ON public.listings;
CREATE TRIGGER listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.set_listings_updated_at();

-- ---------- 5) Migration : un listing published par showroom déjà publié ----------
-- Pour chaque showroom avec publication_status = 'published', créer un listing published
-- avec les dates actuelles de la fiche (début/fin partenariat, ouverture candidatures).
INSERT INTO public.listings (showroom_id, title, status, partnership_start_date, partnership_end_date, application_open_date, application_close_date)
SELECT
  s.id,
  'Session ' || to_char(now(), 'TMMonth YYYY'),
  'published',
  s.start_date::date,
  s.end_date::date,
  (s.candidature_open_from::text)::date,
  (s.candidature_open_to::text)::date
FROM public.showrooms s
WHERE s.publication_status = 'published'
  AND NOT EXISTS (SELECT 1 FROM public.listings l WHERE l.showroom_id = s.id AND l.status = 'published');
