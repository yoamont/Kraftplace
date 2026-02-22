-- Ajouter la période du loyer (semaine, mois, unique) si la table existait déjà sans cette colonne.
-- À exécuter dans Supabase → SQL Editor si vous aviez créé showroom_commission_options avant cette évolution.

alter table public.showroom_commission_options
  add column if not exists rent_period text null default 'month';

-- Supprimer la contrainte si elle existait déjà (pour réappliquer proprement)
alter table public.showroom_commission_options
  drop constraint if exists showroom_commission_options_rent_period_check;

alter table public.showroom_commission_options
  add constraint showroom_commission_options_rent_period_check
  check (rent_period is null or rent_period in ('week', 'month', 'one_off'));
