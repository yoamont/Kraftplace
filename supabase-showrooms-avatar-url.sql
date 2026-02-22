-- Ajouter le champ logo/avatar pour les showrooms.
-- À exécuter dans Supabase → SQL Editor.

alter table public.showrooms
  add column if not exists avatar_url text null;
