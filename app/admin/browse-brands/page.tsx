'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAdminEntity } from '../context/AdminEntityContext';
import { supabase } from '@/lib/supabase';
import { Package, Loader2, ArrowRight } from 'lucide-react';
import type { Brand, Product } from '@/lib/supabase';

export default function BrowseBrandsPage() {
  const { entityType } = useAdminEntity();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [productsByBrandId, setProductsByBrandId] = useState<Record<number, Product[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: productsData } = await supabase
        .from('products')
        .select('brand_id')
        .not('brand_id', 'is', null);
      const brandIds = [...new Set((productsData ?? []).map((p: { brand_id: number }) => p.brand_id).filter(Boolean))] as number[];
      if (brandIds.length === 0) {
        setBrands([]);
        setProductsByBrandId({});
        setLoading(false);
        return;
      }
      const [brandsRes, productsRes] = await Promise.all([
        supabase
          .from('brands')
          .select('id, brand_name, avatar_url, description, image_url')
          .in('id', brandIds)
          .order('brand_name'),
        supabase
          .from('products')
          .select('id, brand_id, product_name, image_url, price')
          .in('brand_id', brandIds)
          .order('created_at', { ascending: false }),
      ]);
      const brandsList = (brandsRes.data as Brand[]) ?? [];
      setBrands(brandsList);
      const products = (productsRes.data as Product[]) ?? [];
      const byBrand: Record<number, Product[]> = {};
      for (const p of products) {
        if (!byBrand[p.brand_id]) byBrand[p.brand_id] = [];
        if (byBrand[p.brand_id].length < 3) byBrand[p.brand_id].push(p);
      }
      setProductsByBrandId(byBrand);
      setLoading(false);
    })();
  }, []);

  if (entityType === 'brand') {
    return (
      <div className="max-w-2xl mx-auto py-8 text-center">
        <p className="text-kraft-700">Cette page est réservée aux boutiques. Sélectionnez une boutique dans le menu pour parcourir les marques.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-kraft-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-xl font-semibold text-kraft-black">Dénichez vos prochaines marques coup de cœur.</h1>
      <p className="mt-2 text-sm text-kraft-700 leading-relaxed">Une sélection exclusive de créateurs prêts à intégrer votre boutique. Parcourez leurs univers, explorez leurs produits phares et initiez la rencontre en un clic.</p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {brands.map((brand) => {
          const topProducts = productsByBrandId[brand.id] ?? [];
          return (
            <article
              key={brand.id}
              className="rounded-xl border-2 border-kraft-300 bg-kraft-50 overflow-hidden shadow-sm flex flex-col"
            >
              <div className="aspect-[3/1] bg-kraft-200">
                {brand.image_url?.trim() ? (
                  <img src={brand.image_url.trim()} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-kraft-600">
                    <Package className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-kraft-200 shrink-0 overflow-hidden flex items-center justify-center border-2 border-kraft-300">
                    {brand.avatar_url?.trim() ? (
                      <img src={brand.avatar_url.trim()} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="h-6 w-6 text-kraft-600" />
                    )}
                  </div>
                  <h2 className="font-semibold text-kraft-black truncate">{brand.brand_name}</h2>
                </div>
                {brand.description?.trim() && (
                  <p className="mt-2 text-sm text-kraft-700 line-clamp-2">{brand.description.trim()}</p>
                )}
                {topProducts.length > 0 && (
                  <div className="mt-3">
                    <div className="flex gap-2">
                      {topProducts.map((product) => (
                        <Link
                          key={product.id}
                          href={`/marque/${brand.id}#produits`}
                          className="flex-1 min-w-0 flex flex-col rounded-lg border border-kraft-300 bg-white overflow-hidden hover:border-kraft-500 transition-colors"
                        >
                          <div className="aspect-square bg-kraft-200">
                            {product.image_url?.trim() ? (
                              <img src={product.image_url.trim()} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-6 w-6 text-kraft-500" />
                              </div>
                            )}
                          </div>
                          <p className="p-1.5 text-xs font-medium text-kraft-800 truncate text-center" title={product.product_name}>
                            {product.product_name}
                          </p>
                          {product.price != null && (
                            <p className="px-1.5 pb-1.5 text-xs font-semibold text-kraft-700 text-center">
                              {Number(product.price).toFixed(2)} €
                            </p>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                <Link
                  href={`/marque/${brand.id}`}
                  className="mt-4 inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-kraft-black text-kraft-off-white text-sm font-medium hover:bg-kraft-900 transition-colors"
                >
                  Voir plus
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      {brands.length === 0 && !loading && (
        <div className="mt-12 rounded-xl border-2 border-kraft-300 bg-kraft-100 p-12 text-center">
          <Package className="h-12 w-12 text-kraft-500 mx-auto mb-4" />
          <p className="text-kraft-700 font-medium">Aucune marque avec catalogue pour le moment.</p>
          <p className="text-sm text-kraft-600 mt-1">Les marques apparaîtront ici dès qu’elles auront ajouté des produits.</p>
        </div>
      )}
    </div>
  );
}
