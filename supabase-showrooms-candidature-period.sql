-- Période d'ouverture des candidatures pour les boutiques.
-- Si les deux dates sont renseignées, le bouton "Candidater" n'est actif qu'entre ces dates.
-- À exécuter dans Supabase → SQL Editor.

ALTER TABLE public.showrooms
  ADD COLUMN IF NOT EXISTS candidature_open_from date;

ALTER TABLE public.showrooms
  ADD COLUMN IF NOT EXISTS candidature_open_to date;

COMMENT ON COLUMN public.showrooms.candidature_open_from IS 'Date de début de la période pendant laquelle les marques peuvent candidater. Null = pas de restriction (toujours ouvert si candidature_open_to null).';
COMMENT ON COLUMN public.showrooms.candidature_open_to IS 'Date de fin de la période pendant laquelle les marques peuvent candidater. Null = pas de restriction.';
