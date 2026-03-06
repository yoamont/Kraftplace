-- ============================================================
-- AUDIT RLS & SÉCURITÉ – À exécuter dans Supabase SQL Editor
-- Vérifie que RLS est activé et qu'aucune politique ne donne
-- un accès illimité (USING(true) / WITH CHECK(true) pour INSERT/UPDATE/DELETE).
-- ============================================================

-- 1) Tables à protéger : RLS doit être activé
-- Exécuter et vérifier que chaque table sensible a RLS = ON
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'brands', 'showrooms', 'listings', 'conversations', 'messages',
    'products', 'placements', 'showroom_badges', 'brand_badges',
    'showroom_commission_options'
  )
ORDER BY tablename;

-- 2) Politiques à risque : SELECT avec USING(true) seul est parfois voulu (ex: brands_select_public).
-- En revanche, aucune politique INSERT/UPDATE/DELETE ne doit avoir USING(true) ou WITH CHECK(true) seul.
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual::text   AS using_expr,
  with_check::text
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3) Messages : la lecture doit être restreinte aux participants de la conversation.
-- La politique messages_select_own doit exister et s'appuyer sur conversations (brand_id/showroom_id + owner_id).
-- Vérification manuelle : pas de policy "FOR SELECT USING (true)" sur messages.
