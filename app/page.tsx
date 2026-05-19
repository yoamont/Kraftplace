'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { toSlug } from '@/lib/slug';
import { supabase } from '@/lib/supabase';
import type { Badge, Brand, Showroom } from '@/lib/supabase';
import { Store, Sparkles, ArrowRight, Building2, Clock, MapPin } from 'lucide-react';
import { BadgeIcon } from '@/app/admin/components/BadgeIcon';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';

const BADGE_DUPLICATES = 3;
const PREVIEW_LIMIT = 5;

type BrandPreview = Pick<Brand, 'id' | 'brand_name' | 'description' | 'avatar_url' | 'image_url'>;
type ShowroomPreview = Pick<Showroom, 'id' | 'name' | 'city' | 'description' | 'avatar_url' | 'image_url' | 'shop_type' | 'is_permanent'>;

export default function HomePage() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [allBrands, setAllBrands] = useState<BrandPreview[]>([]);
  const [allShowrooms, setAllShowrooms] = useState<ShowroomPreview[]>([]);
  const [badgesByBrandId, setBadgesByBrandId] = useState<Record<number, Badge[]>>({});
  const [badgesByShowroomId, setBadgesByShowroomId] = useState<Record<number, Badge[]>>({});

  // Brand filters
  const [brandBadgeIds, setBrandBadgeIds] = useState<Set<number>>(new Set());

  // Showroom filters
  const [showroomCity, setShowroomCity] = useState('');
  const [showroomBadgeIds, setShowroomBadgeIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    (async () => {
      const [
        { data: badgesData },
        { data: brandsData },
        { data: showroomsData },
        { data: brandBadgesData },
        { data: showroomBadgesData },
      ] = await Promise.all([
        supabase.from('badges').select('id, slug, label, icon, sort_order').order('sort_order', { ascending: true }),
        supabase.from('brands').select('id, brand_name, description, avatar_url, image_url').not('image_url', 'is', null).order('created_at', { ascending: false }),
        supabase.from('showrooms').select('id, name, city, description, avatar_url, image_url, shop_type, is_permanent').eq('publication_status', 'published').order('created_at', { ascending: false }),
        supabase.from('brand_badges').select('brand_id, badge_id'),
        supabase.from('showroom_badges').select('showroom_id, badge_id'),
      ]);

      const badgeList = (badgesData as Badge[]) ?? [];
      setBadges(badgeList);
      setAllBrands((brandsData as BrandPreview[]) ?? []);
      setAllShowrooms((showroomsData as ShowroomPreview[]) ?? []);

      const badgeMap = Object.fromEntries(badgeList.map((b) => [b.id, b]));

      const byBrand: Record<number, Badge[]> = {};
      for (const row of (brandBadgesData as { brand_id: number; badge_id: number }[]) ?? []) {
        const badge = badgeMap[row.badge_id];
        if (badge) {
          if (!byBrand[row.brand_id]) byBrand[row.brand_id] = [];
          byBrand[row.brand_id].push(badge);
        }
      }
      setBadgesByBrandId(byBrand);

      const byShowroom: Record<number, Badge[]> = {};
      for (const row of (showroomBadgesData as { showroom_id: number; badge_id: number }[]) ?? []) {
        const badge = badgeMap[row.badge_id];
        if (badge) {
          if (!byShowroom[row.showroom_id]) byShowroom[row.showroom_id] = [];
          byShowroom[row.showroom_id].push(badge);
        }
      }
      setBadgesByShowroomId(byShowroom);
    })();
  }, []);

  const allCities = useMemo(
    () => [...new Set(allShowrooms.map((s) => s.city?.trim()).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b, 'fr')),
    [allShowrooms]
  );

  const filteredBrands = useMemo(() => {
    let result = allBrands;
    if (brandBadgeIds.size > 0) {
      result = result.filter((b) => {
        const ids = new Set((badgesByBrandId[b.id] ?? []).map((badge) => badge.id));
        for (const id of brandBadgeIds) if (!ids.has(id)) return false;
        return true;
      });
    }
    return result.slice(0, PREVIEW_LIMIT);
  }, [allBrands, brandBadgeIds, badgesByBrandId]);

  const filteredShowrooms = useMemo(() => {
    let result = allShowrooms;
    if (showroomCity) result = result.filter((s) => s.city?.trim() === showroomCity);
    if (showroomBadgeIds.size > 0) {
      result = result.filter((s) => {
        const ids = new Set((badgesByShowroomId[s.id] ?? []).map((b) => b.id));
        for (const id of showroomBadgeIds) if (!ids.has(id)) return false;
        return true;
      });
    }
    return result.slice(0, PREVIEW_LIMIT);
  }, [allShowrooms, showroomCity, showroomBadgeIds, badgesByShowroomId]);

  const toggleBrandBadge = (id: number) => setBrandBadgeIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const toggleShowroomBadge = (id: number) => setShowroomBadgeIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  return (
    <div className="min-h-screen bg-[#FBFBFD] flex flex-col">
      <LandingHeader />

      {/* ── HERO ── */}
      <section className="flex flex-col items-center justify-center px-4 pt-16 pb-14 sm:pt-20 sm:pb-18 text-center">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-neutral-900 tracking-tight max-w-2xl leading-[1.2]">
          <span className="font-bold">Kraftplace&nbsp;:</span>{' '}
          Le commerce engagé.
        </h1>
        <p className="mt-4 text-sm sm:text-base text-neutral-500 max-w-md">
          La plateforme B2B qui connecte boutiques indépendantes et marques responsables.
        </p>

        {badges.length > 0 && (
          <div className="mt-8 w-full max-w-2xl overflow-hidden">
            <div className="flex w-max mx-auto animate-scroll-badges items-center gap-3 px-4">
              {Array.from({ length: BADGE_DUPLICATES }).map((_, block) => (
                <div key={block} className="flex items-center gap-3 shrink-0">
                  {badges.map((badge) => (
                    <span
                      key={`${block}-${badge.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1.5 text-[11px] font-medium text-neutral-600 border border-black/[0.06] shrink-0 shadow-sm"
                      aria-hidden
                    >
                      <BadgeIcon badge={badge} className="w-3.5 h-3 shrink-0 inline-block" />
                      <span>{badge.label}</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── COMMENT ÇA MARCHE ── */}
      <section className="border-t border-black/[0.06] bg-neutral-50/60">
        <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
          <h2 className="text-lg sm:text-xl font-semibold text-neutral-900 tracking-tight text-center mb-10">
            Comment ça marche
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="rounded-2xl bg-white border border-black/[0.06] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-neutral-700" strokeWidth={1.5} />
                </div>
                <span className="font-semibold text-neutral-900 text-[15px]">Vous êtes une marque</span>
              </div>
              <ol className="space-y-5">
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">Créez votre profil</p>
                    <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">Présentez votre univers, vos produits et vos engagements.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">Découvrez des boutiques</p>
                    <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">Parcourez les lieux triés par engagements, ville et type.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">Postulez & collaborez</p>
                    <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">Envoyez une candidature et finalisez via la messagerie intégrée.</p>
                  </div>
                </li>
              </ol>
            </div>
            <div className="rounded-2xl bg-white border border-black/[0.06] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                  <Store className="h-4 w-4 text-neutral-700" strokeWidth={1.5} />
                </div>
                <span className="font-semibold text-neutral-900 text-[15px]">Vous êtes une boutique</span>
              </div>
              <ol className="space-y-5">
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">Publiez votre espace</p>
                    <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">Décrivez votre lieu, vos dates et vos conditions de partenariat.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">Recevez des candidatures</p>
                    <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">Les marques alignées avec vos valeurs viennent à vous.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <div>
                    <p className="text-sm font-medium text-neutral-900">Échangez & validez</p>
                    <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">Discutez des conditions et confirmez la collaboration en quelques messages.</p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* ── GALERIES ── */}
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

            {/* Filtres marques */}
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

            {/* Filtres boutiques */}
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

      <LandingFooter />
    </div>
  );
}
