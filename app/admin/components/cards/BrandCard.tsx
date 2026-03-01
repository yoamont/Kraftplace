'use client';

import Link from 'next/link';
import { Package } from 'lucide-react';
import type { Brand, Product, Badge } from '@/lib/supabase';
import { BadgeIcon } from '@/app/admin/components/BadgeIcon';

export type BrandCardProps = {
  /** Données marque (mêmes champs Supabase partout : aperçu config + Parcourir les marques). */
  brand: Pick<Brand, 'id' | 'brand_name' | 'description' | 'avatar_url' | 'image_url'>;
  /** Produits phares (optionnel, ex. pour "Parcourir les marques"). */
  products?: Product[];
  badges?: Badge[];
  /** Bloc d’action contextuel : "Voir les produits", "Voir la candidature", "Contacter", etc. */
  children: React.ReactNode;
};

/**
 * Fiche marque unique - même rendu sur l’aperçu du profil marque et sur "Parcourir les marques" (boutique).
 * Les mêmes champs Supabase sont affichés (nom, description, photos). Optionnellement une bande de produits.
 */
export function BrandCard({ brand, products = [], badges = [], children }: BrandCardProps) {
  return (
    <article className="rounded-[12px] bg-white overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-shadow duration-200 flex flex-col">
      <div className="aspect-[3/1] bg-neutral-50/80 relative">
        {brand.image_url?.trim() ? (
          <img src={brand.image_url.trim()} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-300">
            <Package className="h-8 w-8" />
          </div>
        )}
        {badges.length > 0 && (
          <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1.5">
            {badges.slice(0, 5).map((b) => (
              <span
                key={b.id}
                className="inline-flex items-center gap-1 rounded-full bg-white/95 backdrop-blur px-2 py-0.5 text-xs font-medium text-neutral-800 shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
              >
                <BadgeIcon badge={b} className="w-4 h-3 shrink-0 inline-block" />
                <span>{b.label}</span>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-neutral-100 shrink-0 overflow-hidden flex items-center justify-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            {brand.avatar_url?.trim() ? (
              <img src={brand.avatar_url.trim()} alt="" className="w-full h-full object-cover" />
            ) : (
              <Package className="h-6 w-6 text-neutral-400" />
            )}
          </div>
          <h2 className="font-semibold text-neutral-900 truncate">{brand.brand_name || 'Nom de la marque'}</h2>
        </div>
        {brand.description?.trim() ? (
          <p className="mt-2 text-sm text-neutral-600 line-clamp-2">{brand.description.trim()}</p>
        ) : (
          <p className="mt-2 text-sm text-neutral-400 italic">Description de la marque…</p>
        )}
        {products.length > 0 && (
          <div className="mt-4">
            <div className="flex gap-2">
              {products.slice(0, 3).map((product) => (
                <Link
                  key={product.id}
                  href={`/marque/${brand.id}#produits`}
                  className="flex-1 min-w-0 flex flex-col rounded-xl bg-neutral-50/80 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.06)] transition-shadow duration-150"
                >
                  <div className="aspect-square bg-neutral-100">
                    {product.image_url?.trim() ? (
                      <img src={product.image_url.trim()} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-6 w-6 text-neutral-400" />
                      </div>
                    )}
                  </div>
                  <p className="p-1.5 text-xs font-medium text-neutral-800 truncate text-center" title={product.product_name}>
                    {product.product_name}
                  </p>
                  {product.price != null && (
                    <p className="px-1.5 pb-1.5 text-xs font-semibold text-neutral-700 text-center">
                      {Number(product.price).toFixed(2)} €
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
        <div className="mt-5">
          {children}
        </div>
      </div>
    </article>
  );
}
