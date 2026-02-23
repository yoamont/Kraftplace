-- Bucket privé "brand-documents" pour les documents des marques (ex. attestation RC Pro).
-- À exécuter dans Supabase → SQL Editor.
--
-- 1) Créer le bucket dans le Dashboard : Storage → New bucket →
--    id = "brand-documents", NE PAS cocher "Public bucket" (privé).
-- 2) Exécuter ce script pour les policies.

-- Seul le propriétaire de la marque peut déposer / lire / supprimer dans brands/<brand_id>/
-- (brand_id doit être un id de marque dont owner_id = auth.uid())

DROP POLICY IF EXISTS "brand-documents insert own" ON storage.objects;
DROP POLICY IF EXISTS "brand-documents select own" ON storage.objects;
DROP POLICY IF EXISTS "brand-documents update own" ON storage.objects;
DROP POLICY IF EXISTS "brand-documents delete own" ON storage.objects;

CREATE POLICY "brand-documents insert own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'brand-documents'
  AND (storage.foldername(name))[1] = 'brands'
  AND (storage.foldername(name))[2] IN (SELECT id::text FROM public.brands WHERE owner_id = auth.uid())
);

CREATE POLICY "brand-documents select own"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'brand-documents'
  AND (storage.foldername(name))[1] = 'brands'
  AND (storage.foldername(name))[2] IN (SELECT id::text FROM public.brands WHERE owner_id = auth.uid())
);

CREATE POLICY "brand-documents update own"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'brand-documents'
  AND (storage.foldername(name))[1] = 'brands'
  AND (storage.foldername(name))[2] IN (SELECT id::text FROM public.brands WHERE owner_id = auth.uid())
);

CREATE POLICY "brand-documents delete own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'brand-documents'
  AND (storage.foldername(name))[1] = 'brands'
  AND (storage.foldername(name))[2] IN (SELECT id::text FROM public.brands WHERE owner_id = auth.uid())
);
