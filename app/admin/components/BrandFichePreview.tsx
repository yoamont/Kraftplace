'use client';

import Link from 'next/link';
import { BrandCard } from './cards/BrandCard';
import type { Badge } from '@/lib/supabase';

type Props = {
  brandName: string;
  description: string | null;
  avatarUrl: string | null;
  imageUrl: string | null;
  brandId: number;
  /** Badges de valeurs (aperçu config). */
  badges?: Badge[];
  /** Si true, le CTA est un lien vers la page collection. Sinon juste un bouton visuel (preview). */
  linkToCollection?: boolean;
};

/** Aperçu de la fiche marque (utilise BrandCard). Même rendu que "Parcourir les marques" côté boutique. */
export function BrandFichePreview({ brandName, description, avatarUrl, imageUrl, brandId, badges = [], linkToCollection = true }: Props) {
  const brandPreview = {
    id: brandId,
    brand_name: brandName || 'Nom de la marque',
    description,
    avatar_url: avatarUrl,
    image_url: imageUrl,
  };

  return (
    <BrandCard brand={brandPreview} badges={badges}>
      {linkToCollection ? (
        <Link
          href={`/marque/${brandId}`}
          className="block w-full py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-medium text-center hover:bg-neutral-800"
        >
          Voir les produits
        </Link>
      ) : (
        <span className="block w-full py-2.5 rounded-lg bg-neutral-200 text-neutral-500 text-sm font-medium text-center">
          Voir les produits
        </span>
      )}
    </BrandCard>
  );
}
