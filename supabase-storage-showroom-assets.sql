-- Policies Storage pour le bucket "showroom-assets" (logo et image de couverture des boutiques).
-- À exécuter dans Supabase → SQL Editor.
--
-- Créer le bucket d’abord dans le Dashboard : Storage → New bucket →
-- id = "showroom-assets", cocher "Public bucket".
-- Puis exécuter ce script pour les policies.

drop policy if exists "showroom-assets insert authenticated" on storage.objects;
drop policy if exists "showroom-assets update authenticated" on storage.objects;
drop policy if exists "showroom-assets select public" on storage.objects;
drop policy if exists "showroom-assets delete authenticated" on storage.objects;

create policy "showroom-assets insert authenticated"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'showroom-assets'
  and (storage.foldername(name))[1] = 'showrooms'
);

create policy "showroom-assets update authenticated"
on storage.objects for update to authenticated
using (bucket_id = 'showroom-assets' and (storage.foldername(name))[1] = 'showrooms');

create policy "showroom-assets select public"
on storage.objects for select to public
using (bucket_id = 'showroom-assets');

create policy "showroom-assets delete authenticated"
on storage.objects for delete to authenticated
using (bucket_id = 'showroom-assets' and (storage.foldername(name))[1] = 'showrooms');
