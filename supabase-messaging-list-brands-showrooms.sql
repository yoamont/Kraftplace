-- ============================================================
-- Messagerie B2B : permettre de lister les marques et boutiques
-- pour le modal "Nouvelle conversation".
-- À exécuter dans Supabase → SQL Editor.
-- ============================================================
-- Sans ces politiques, la RLS ne renvoie que ses propres lignes :
-- un créateur ne voit aucune boutique, une boutique ne voit aucune marque.
-- On autorise les utilisateurs authentifiés à lire les marques et
-- les showrooms (la liste "boutiques publiées" est filtrée côté app).
-- ============================================================

-- Marques : tout utilisateur authentifié peut les lister
drop policy if exists "brands_select_for_messaging" on public.brands;
create policy "brands_select_for_messaging"
  on public.brands for select
  to authenticated
  using (true);

-- Boutiques (showrooms) : tout utilisateur authentifié peut les lister
drop policy if exists "showrooms_select_for_messaging" on public.showrooms;
create policy "showrooms_select_for_messaging"
  on public.showrooms for select
  to authenticated
  using (true);
