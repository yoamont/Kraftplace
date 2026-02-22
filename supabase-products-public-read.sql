-- Lecture publique des produits : permettre à tout le monde (ex. boutiques) de voir les produits d’une marque.
-- Nécessaire pour la page publique /marque/[brandId] (collection).
-- À exécuter dans Supabase → SQL Editor.

alter table public.products enable row level security;

drop policy if exists "products_select_public" on public.products;
create policy "products_select_public" on public.products
  for select using (true);
