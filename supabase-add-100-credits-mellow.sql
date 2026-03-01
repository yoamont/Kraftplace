-- Ajoute 100 crédits à la marque "mellow".
-- À exécuter dans Supabase → SQL Editor.

UPDATE public.brands
SET credits = COALESCE(credits, 0) + 100
WHERE LOWER(TRIM(brand_name)) = 'mellow';

-- Vérification (optionnel) : affiche le solde après mise à jour
-- SELECT id, brand_name, credits, reserved_credits FROM public.brands WHERE LOWER(TRIM(brand_name)) = 'mellow';
