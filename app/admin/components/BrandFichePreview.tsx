'use client';

import Link from 'next/link';
import { Package } from 'lucide-react';

type Props = {
  brandName: string;
  description: string | null;
  avatarUrl: string | null;
  imageUrl: string | null;
  brandId: number;
  /** Si true, le CTA est un lien vers la page collection. Sinon juste un bouton visuel (preview). */
  linkToCollection?: boolean;
};

export function BrandFichePreview({ brandName, description, avatarUrl, imageUrl, brandId, linkToCollection = true }: Props) {
  return (
    <article className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
      {/* Image de couverture */}
      <div className="aspect-[3/1] bg-neutral-100">
        {imageUrl?.trim() ? (
          <img src={imageUrl.trim()} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-300">
            <span className="text-sm">Image de couverture</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-neutral-100 shrink-0 overflow-hidden flex items-center justify-center border border-neutral-200">
            {avatarUrl?.trim() ? (
              <img src={avatarUrl.trim()} alt="" className="w-full h-full object-cover" />
            ) : (
              <Package className="h-6 w-6 text-neutral-400" />
            )}
          </div>
          <h2 className="font-semibold text-neutral-900 text-lg truncate">{brandName || 'Nom de la marque'}</h2>
        </div>
        {description?.trim() && (
          <p className="mt-3 text-sm text-neutral-600 line-clamp-3">{description.trim()}</p>
        )}
        {!description?.trim() && (
          <p className="mt-3 text-sm text-neutral-400 italic">Description de la marque…</p>
        )}
        <div className="mt-4">
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
        </div>
      </div>
    </article>
  );
}
