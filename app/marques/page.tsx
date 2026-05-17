'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, SlidersHorizontal, X, Loader2, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { PublicBrandCard } from '@/components/public/PublicBrandCard';
import { BadgeIcon } from '@/app/admin/components/BadgeIcon';
import type { Brand, Product, Badge } from '@/lib/supabase';

export default function MarquesGaleriePage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [productsByBrandId, setProductsByBrandId] = useState<Record<number, Product[]>>({});
  const [badgesByBrandId, setBadgesByBrandId] = useState<Record<number, Badge[]>>({});
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBadgeIds, setSelectedBadgeIds] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: productsData } = await supabase
        .from('products')
        .select('brand_id')
        .not('brand_id', 'is', null);

      const brandIds = [
        ...new Set(
          (productsData ?? [])
            .map((p: { brand_id: number }) => p.brand_id)
            .filter(Boolean)
        ),
      ] as number[];

      if (brandIds.length === 0) {
        setLoading(false);
        return;
      }

      const [brandsRes, productsRes, { data: badgesData }, { data: brandBadgesData }] =
        await Promise.all([
          supabase
            .from('brands')
            .select('id, brand_name, avatar_url, description, image_url, instagram_handle, website_url')
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
      setAllBadges(badgesList);
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

  const filteredBrands = useMemo(() => {
    let result = brands;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (b) =>
          b.brand_name?.toLowerCase().includes(q) ||
          b.description?.toLowerCase().includes(q)
      );
    }

    if (selectedBadgeIds.size > 0) {
      result = result.filter((b) => {
        const brandBadgeIds = new Set((badgesByBrandId[b.id] ?? []).map((badge) => badge.id));
        for (const id of selectedBadgeIds) {
          if (!brandBadgeIds.has(id)) return false;
        }
        return true;
      });
    }

    return result;
  }, [brands, searchQuery, selectedBadgeIds, badgesByBrandId]);

  const toggleBadge = (badgeId: number) => {
    setSelectedBadgeIds((prev) => {
      const next = new Set(prev);
      if (next.has(badgeId)) {
        next.delete(badgeId);
      } else {
        next.add(badgeId);
      }
      return next;
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedBadgeIds(new Set());
  };

  const hasActiveFilters = searchQuery.trim() !== '' || selectedBadgeIds.size > 0;

  return (
    <div className="min-h-screen bg-[#FBFBFD] flex flex-col">
      <LandingHeader />

      <section className="px-4 pt-12 pb-8 sm:pt-16 sm:pb-10 text-center border-b border-black/[0.06]">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-neutral-900 tracking-tight">
          Nos marques partenaires
        </h1>
        <p className="mt-3 text-sm sm:text-base text-neutral-500 max-w-lg mx-auto">
          Découvrez les créateurs artisanaux et éthiques présents sur Kraftplace.
        </p>
      </section>

      <section className="sticky top-[calc(2.25rem+57px)] z-40 bg-[#FBFBFD]/95 backdrop-blur-md border-b border-black/[0.06]">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Rechercher une marque..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-black/[0.08] text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-300 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                showFilters || selectedBadgeIds.size > 0
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white text-neutral-700 border-black/[0.08] hover:border-neutral-300'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Engagements</span>
              {selectedBadgeIds.size > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-xs font-bold">
                  {selectedBadgeIds.size}
                </span>
              )}
            </button>
          </div>

          {showFilters && allBadges.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 pb-1">
              {allBadges.map((badge) => {
                const isActive = selectedBadgeIds.has(badge.id);
                return (
                  <button
                    key={badge.id}
                    onClick={() => toggleBadge(badge.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-neutral-900 text-white shadow-sm'
                        : 'bg-white text-neutral-700 border border-black/[0.08] hover:border-neutral-300 hover:bg-neutral-50'
                    }`}
                  >
                    <BadgeIcon badge={badge} className="w-4 h-3 shrink-0 inline-block" />
                    {badge.label}
                  </button>
                );
              })}
            </div>
          )}

          {hasActiveFilters && (
            <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
              <span>
                {filteredBrands.length} marque{filteredBrands.length !== 1 ? 's' : ''} trouvée{filteredBrands.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={clearFilters}
                className="text-neutral-600 hover:text-neutral-900 underline underline-offset-2"
              >
                Effacer les filtres
              </button>
            </div>
          )}
        </div>
      </section>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
          </div>
        ) : filteredBrands.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[30vh] text-center">
            <Package className="h-12 w-12 text-neutral-300 mb-4" />
            {hasActiveFilters ? (
              <>
                <p className="text-neutral-700 font-medium">Aucune marque ne correspond à vos critères.</p>
                <button
                  onClick={clearFilters}
                  className="mt-3 text-sm text-neutral-600 hover:text-neutral-900 underline underline-offset-2"
                >
                  Effacer les filtres
                </button>
              </>
            ) : (
              <p className="text-neutral-500">Aucune marque pour le moment.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBrands.map((brand) => (
              <PublicBrandCard
                key={brand.id}
                brand={brand}
                products={productsByBrandId[brand.id] ?? []}
                badges={badgesByBrandId[brand.id] ?? []}
              />
            ))}
          </div>
        )}
      </main>

      <LandingFooter />
    </div>
  );
}
