'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Package, ArrowRight } from 'lucide-react';
import type { Brand, Product, Badge } from '@/lib/supabase';
import { BadgeIcon } from '@/app/admin/components/BadgeIcon';

export type PublicBrandCardProps = {
  brand: Pick<Brand, 'id' | 'brand_name' | 'description' | 'avatar_url' | 'image_url'>;
  products?: Product[];
  badges?: Badge[];
};

export function PublicBrandCard({ brand, products = [], badges = [] }: PublicBrandCardProps) {
  return (
    <Link
      href={`/marque/${brand.id}`}
      className="group rounded-2xl bg-white overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-200 flex flex-col"
    >
      <div className="aspect-[3/1] bg-neutral-100 relative">
        {brand.image_url?.trim() ? (
          <Image
            src={brand.image_url.trim()}
            alt={brand.brand_name ?? ''}
            fill
            className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
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
                className="inline-flex items-center gap-1 rounded-full bg-white/95 backdrop-blur px-2 py-0.5 text-[11px] font-medium text-neutral-800 shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
              >
                <BadgeIcon badge={b} className="w-4 h-3 shrink-0 inline-block" />
                <span>{b.label}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-neutral-100 shrink-0 overflow-hidden flex items-center justify-center relative">
            {brand.avatar_url?.trim() ? (
              <Image
                src={brand.avatar_url.trim()}
                alt=""
                fill
                className="object-cover"
                sizes="44px"
              />
            ) : (
              <Package className="h-5 w-5 text-neutral-400" />
            )}
          </div>
          <h2 className="font-semibold text-neutral-900 truncate text-[15px]">
            {brand.brand_name || 'Marque'}
          </h2>
        </div>

        {brand.description?.trim() && (
          <p className="mt-2 text-sm text-neutral-600 line-clamp-2 leading-relaxed">
            {brand.description.trim()}
          </p>
        )}

        {products.length > 0 && (
          <div className="mt-3 flex gap-1.5">
            {products.slice(0, 3).map((product) => (
              <div
                key={product.id}
                className="flex-1 aspect-square rounded-lg bg-neutral-100 overflow-hidden relative"
              >
                {product.image_url?.trim() ? (
                  <Image
                    src={product.image_url.trim()}
                    alt={product.product_name ?? ''}
                    fill
                    className="object-cover"
                    sizes="120px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-5 w-5 text-neutral-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-auto pt-3">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 group-hover:text-neutral-900 transition-colors">
            Voir la marque
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  );
}
