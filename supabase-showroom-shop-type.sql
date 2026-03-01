-- Identité boutique : type Permanent vs Éphémère (shop_type)
-- Les dates start_date/end_date deviennent "dates d'existence du lieu" pour les éphémères.

ALTER TABLE public.showrooms
  ADD COLUMN IF NOT EXISTS shop_type text DEFAULT 'permanent';

-- Contrainte : valeurs autorisées
ALTER TABLE public.showrooms
  DROP CONSTRAINT IF EXISTS showrooms_shop_type_check;
ALTER TABLE public.showrooms
  ADD CONSTRAINT showrooms_shop_type_check CHECK (shop_type IN ('permanent', 'ephemeral'));

-- Rétrocompat : déduire shop_type à partir de is_permanent pour les lignes existantes
UPDATE public.showrooms
SET shop_type = CASE WHEN COALESCE(is_permanent, true) = true THEN 'permanent' ELSE 'ephemeral' END
WHERE shop_type IS NULL;

-- Défaut pour les nouvelles lignes
ALTER TABLE public.showrooms
  ALTER COLUMN shop_type SET DEFAULT 'permanent';

COMMENT ON COLUMN public.showrooms.shop_type IS 'Type d''établissement : permanent (ouvert à l''année) ou ephemeral (dates d''existence du lieu obligatoires).';
