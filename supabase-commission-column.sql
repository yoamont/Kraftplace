-- À exécuter dans Supabase (SQL Editor) pour créer la colonne commission_percent.
-- 1. Ouvre ton projet Supabase → https://supabase.com/dashboard
-- 2. Menu de gauche : SQL Editor
-- 3. New query → colle le code ci-dessous → Run

ALTER TABLE products
ADD COLUMN commission_percent numeric(5,2) CHECK (commission_percent >= 0 AND commission_percent <= 100);
