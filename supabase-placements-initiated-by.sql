-- Badge origine de la demande : qui a initié le placement (marque ou boutique)
-- À exécuter dans l’ordre des migrations Supabase.

alter table public.placements
  add column if not exists initiated_by text null default 'brand';

comment on column public.placements.initiated_by is 'Qui a créé la demande : brand = marque (candidature), showroom = boutique (contre-offre)';

alter table public.placements
  drop constraint if exists placements_initiated_by_check;

alter table public.placements
  add constraint placements_initiated_by_check
  check (initiated_by is null or initiated_by in ('brand', 'showroom'));

-- Rétro-compat : les lignes existantes restent en 'brand'
update public.placements set initiated_by = 'brand' where initiated_by is null;
