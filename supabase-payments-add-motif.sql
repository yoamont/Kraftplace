-- Ajouter le motif du paiement (pour toute demande).
-- Exécuter dans Supabase → SQL Editor (après supabase-payments.sql).

alter table public.payment_requests
  add column if not exists motif text null;
