'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Store, Sparkles, ArrowRight, Building2, Clock, MapPin } from 'lucide-react';
import { BadgeIcon } from '@/app/admin/components/BadgeIcon';
import { toSlug } from '@/lib/slug';
import type { Badge } from '@/lib/supabase';

const PREVIEW_LIMIT = 5;

type BrandPreview = {
  id: number;
  brand_name: string | null;
  description: string | null;
  avatar_url: string | null;
  image_url: string | null;
};

type ShowroomPreview = {
  id: number;
  name: string | null;
  city: string | null;
  description: string | null;
  avatar_url: string | null;
  image_url: string | null;
  shop_type: string | null;
  is_permanent: boolean | null;
};

interface Props {
  brands: BrandPreview[];
  showrooms: ShowroomPreview[];
  badges: Badge[];
  badgesByBrandId: Record<number, Badge[]>;
  badgesByShowroomId: Record<number, Badge[]>;
  allCities: string[];
}

export function HomeGalleries({ brands, showrooms, badges, badgesByBrandId, badgesByShowroomId, allCities }: Props) {
  const [brandBadgeIds, setBrandBadgeIds] = useState<Set<number>>(new Set());
  const [showroomCity, setShowroomCity] = useState('');
  const [showroomBadgeIds, setShowroomBadgeIds] = useState<Set<number>>(new Set());

  const toggleBrandBadge = (id: number) =>
    setBrandBadgeIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const toggleShowroomBadge = (id: number) =>
    setShowroomBadgeIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const filteredBrands = useMemo(() => {
    let result = brands;
    if (brandBadgeIds.size > 0) {
      result = result.filter((b) => {
        const ids = new Set((badgesByBrandId[b.id] ?? []).map((badge) => badge.id));
        for (const id of brandBadgeIds) if (!ids.has(id)) return false;
        return true;
      });
    }
    return result.slice(0, PREVIEW_LIMIT);
  }, [brands, brandBadgeIds, badgesByBrandId]);

  const filteredShowrooms = useMemo(() => {
    let result = showrooms;
    if (showroomCity) result = result.filter((s) => s.city?.trim() === showroomCity);
    if (showroomBadgeIds.size > 0) {
      result = result.filter((s) => {
        const ids = new Set((badgesByShowroomId[s.id] ?? []).map((b) => b.id));
        for (const id of showroomBadgeIds) if (!ids.has(id)) return false;
        return true;
      });
    }
    return result.slice(0, PREVIEW_LIMIT);
  }, [showrooms, showroomCity, showroomBadgeIds, badgesByShowroomId]);

  return (
    <section className="border-t border-black/[0.06]">
      <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16 space-y-14">

        {/* ── Marques ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-neutral-900 tracking-tight">Marques</h2>
            <Link href="/marques" className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors">
              Voir toutes <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {badges.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {badges.map((badge) => {
                const active = brandBadgeIds.has(badge.id);
                return (
                  <button
                    key={badge.id}
                    type="button"
                    onClick={() => toggleBrandBadge(badge.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${active ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-black/[0.08] hover:border-neutral-300'}`}
                  >
                    <BadgeIcon badge={badge} className="w-3.5 h-3 shrink-0 inline-block" />
                    {badge.label}
                  </button>
                );
              })}
            </div>
          )}

          {filteredBrands.length === 0 ? (
            <p className="text-sm text-neutral-400 py-6 text-center">Aucune marque ne correspond à ces valeurs.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredBrands.map((brand) => (
                <Link
                  key={brand.id}
                  href={`/marque/${toSlug(brand.brand_name ?? '', brand.id)}`}
                  className="group rounded-2xl bg-white overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-200"
                >
                  <div className="aspect-[4/3] bg-neutral-100 overflow-hidden">
                    {brand.image_url?.trim() ? (
                      <img src={brand.image_url.trim()} alt={brand.brand_name ?? ''} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-300"><Sparkles className="h-10 w-10" /></div>
                    )}
                  </div>
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-neutral-100 shrink-0 overflow-hidden flex items-center justify-center">
                      {brand.avatar_url?.trim() ? <img src={brand.avatar_url.trim()} alt="" className="w-full h-full object-cover" /> : <Sparkles className="h-4 w-4 text-neutral-400" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-neutral-900 text-sm truncate">{brand.brand_name || 'Marque'}</p>
                      {brand.description?.trim() && <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">{brand.description.trim()}</p>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Boutiques ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-neutral-900 tracking-tight">Boutiques</h2>
            <Link href="/boutiques" className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors">
              Voir toutes <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-5">
            {allCities.length > 0 && (
              <div className="relative">
                <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
                <select
                  value={showroomCity}
                  onChange={(e) => setShowroomCity(e.target.value)}
                  className={`appearance-none pl-7 pr-6 py-1.5 rounded-full border text-xs font-medium transition-all cursor-pointer ${showroomCity ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-black/[0.08] hover:border-neutral-300'}`}
                >
                  <option value="">Toutes les villes</option>
                  {allCities.map((city) => <option key={city} value={city}>{city}</option>)}
                </select>
              </div>
            )}
            {badges.map((badge) => {
              const active = showroomBadgeIds.has(badge.id);
              return (
                <button
                  key={badge.id}
                  type="button"
                  onClick={() => toggleShowroomBadge(badge.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${active ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-black/[0.08] hover:border-neutral-300'}`}
                >
                  <BadgeIcon badge={badge} className="w-3.5 h-3 shrink-0 inline-block" />
                  {badge.label}
                </button>
              );
            })}
          </div>

          {filteredShowrooms.length === 0 ? (
            <p className="text-sm text-neutral-400 py-6 text-center">Aucune boutique ne correspond à ces critères.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredShowrooms.map((showroom) => {
                const isEphemeral = showroom.shop_type === 'ephemeral' || (showroom.shop_type !== 'permanent' && showroom.is_permanent === false);
                return (
                  <Link
                    key={showroom.id}
                    href={`/boutique/${toSlug(showroom.name ?? '', showroom.id)}`}
                    className="group rounded-2xl bg-white overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-200"
                  >
                    <div className="aspect-[4/3] bg-neutral-100 overflow-hidden">
                      {showroom.image_url?.trim() ? (
                        <img src={showroom.image_url.trim()} alt={showroom.name ?? ''} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-300"><Store className="h-10 w-10" /></div>
                      )}
                    </div>
                    <div className="p-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-neutral-100 shrink-0 overflow-hidden flex items-center justify-center">
                        {showroom.avatar_url?.trim() ? <img src={showroom.avatar_url.trim()} alt="" className="w-full h-full object-cover" /> : <Store className="h-4 w-4 text-neutral-400" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-neutral-900 text-sm truncate">{showroom.name || 'Boutique'}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {isEphemeral ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700"><Clock className="h-3 w-3" /> Éphémère</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500"><Building2 className="h-3 w-3" /> Permanente</span>
                          )}
                          {showroom.city && <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400"><MapPin className="h-3 w-3" /> {showroom.city}</span>}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
