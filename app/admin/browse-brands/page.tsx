'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAdminEntity } from '../context/AdminEntityContext';
import { supabase } from '@/lib/supabase';
import { Package, Loader2, ArrowRight } from 'lucide-react';
import type { Brand, Product, Badge } from '@/lib/supabase';
import { BrandCard } from '../components/cards/BrandCard';

export default function BrowseBrandsPage() {
  const { entityType } = useAdminEntity();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [productsByBrandId, setProductsByBrandId] = useState<Record<number, Product[]>>({});
  const [badgesByBrandId, setBadgesByBrandId] = useState<Record<number, Badge[]>>({});
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
        setBadgesByBrandId({});
        setLoading(false);
        return;
      }
      const [brandsRes, productsRes, { data: badgesData }, { data: brandBadgesData }] = await Promise.all([
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
        supabase.from('badges').select('*').order('sort_order'),
        supabase.from('brand_badges').select('brand_id, badge_id').in('brand_id', brandIds),
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
      const badgesList = (badgesData as Badge[]) ?? [];
      const badgeMap = Object.fromEntries(badgesList.map((b) => [b.id, b]));
      const bbList = (brandBadgesData as { brand_id: number; badge_id: number }[]) ?? [];
      const badgesByBrand: Record<number, Badge[]> = {};
      for (const bb of bbList) {
        const badge = badgeMap[bb.badge_id];
        if (badge) {
          if (!badgesByBrand[bb.brand_id]) badgesByBrand[bb.brand_id] = [];
          badgesByBrand[bb.brand_id].push(badge);
        }
      }
      setBadgesByBrandId(badgesByBrand);
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
            <BrandCard
              key={brand.id}
              brand={brand}
              products={topProducts}
              badges={badgesByBrandId[brand.id] ?? []}
            >
              <Link
                href={`/marque/${brand.id}`}
                className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors"
              >
                Voir plus
                <ArrowRight className="h-4 w-4" />
              </Link>
            </BrandCard>
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
