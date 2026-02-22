-- À exécuter dans Supabase (SQL Editor) pour créer la colonne stock_max.
-- 1. Ouvre ton projet Supabase → https://supabase.com/dashboard
-- 2. Menu de gauche : SQL Editor
-- 3. New query → colle le code ci-dessous → Run

ALTER TABLE products
ADD COLUMN stock_max integer CHECK (stock_max >= 0);
