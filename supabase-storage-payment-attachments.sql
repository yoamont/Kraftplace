-- Storage : pièces jointes des rapports de ventes (demandes de paiement).
-- Créer le bucket "payment-attachments" dans Dashboard → Storage en mode Restrict (privé).
-- Optionnel : restreindre les types MIME (ex. pdf, png, jpg, xlsx) pour plus de sécurité.
-- Puis exécuter ce script.

drop policy if exists "payment-attachments insert showroom" on storage.objects;
drop policy if exists "payment-attachments insert brand" on storage.objects;
drop policy if exists "payment-attachments select brand showroom" on storage.objects;
drop policy if exists "payment-attachments delete showroom" on storage.objects;

-- Showroom peut uploader dans payment-attachments/showrooms/<showroom_id>/
create policy "payment-attachments insert showroom"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'payment-attachments'
  and (storage.foldername(name))[1] = 'showrooms'
);

-- Marque peut uploader dans payment-attachments/brands/<brand_id>/
create policy "payment-attachments insert brand"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'payment-attachments'
  and (storage.foldername(name))[1] = 'brands'
);

-- Lecture : marque et showroom (via RLS sur la table payment_requests on pourrait restreindre par objet ; ici on autorise les authentifiés sur le bucket)
create policy "payment-attachments select brand showroom"
on storage.objects for select to authenticated
using (bucket_id = 'payment-attachments');

create policy "payment-attachments delete showroom"
on storage.objects for delete to authenticated
using (bucket_id = 'payment-attachments' and (storage.foldername(name))[1] = 'showrooms');
