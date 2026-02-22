-- Policies Storage pour le bucket "brand-assets" (images des marques).
-- À exécuter dans Supabase → SQL Editor.
--
-- Créer le bucket d’abord dans le Dashboard : Storage → New bucket →
-- id = "brand-assets", cocher "Public bucket".
-- Puis exécuter ce script pour les policies.

-- Supprimer les policies existantes pour pouvoir réexécuter le script
drop policy if exists "brand-assets insert authenticated" on storage.objects;
drop policy if exists "brand-assets update authenticated" on storage.objects;
drop policy if exists "brand-assets select public" on storage.objects;
drop policy if exists "brand-assets delete authenticated" on storage.objects;

-- Les utilisateurs authentifiés peuvent upload/update/supprimer dans brands/<id>/
create policy "brand-assets insert authenticated"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'brand-assets'
  and (storage.foldername(name))[1] = 'brands'
);

create policy "brand-assets update authenticated"
on storage.objects for update to authenticated
using (bucket_id = 'brand-assets' and (storage.foldername(name))[1] = 'brands');

create policy "brand-assets select public"
on storage.objects for select to public
using (bucket_id = 'brand-assets');

create policy "brand-assets delete authenticated"
on storage.objects for delete to authenticated
using (bucket_id = 'brand-assets' and (storage.foldername(name))[1] = 'brands');
