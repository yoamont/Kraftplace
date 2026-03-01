'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
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

/** Aperçu de la fiche marque (utilise BrandCard). Même rendu que l’onglet Marques côté boutique. */
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
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors duration-150"
        >
          Voir plus
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </Link>
      ) : (
        <span className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-neutral-200 text-neutral-500 text-sm font-medium">
          Voir plus
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </span>
      )}
    </BrandCard>
  );
}
