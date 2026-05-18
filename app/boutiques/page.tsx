'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, SlidersHorizontal, MapPin, X, Loader2, Store } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { PublicShowroomCard } from '@/components/public/PublicShowroomCard';
import { BadgeIcon } from '@/app/admin/components/BadgeIcon';
import type { Showroom, Badge } from '@/lib/supabase';

export default function BoutiquesGaleriePage() {
  const [showrooms, setShowrooms] = useState<Showroom[]>([]);
  const [badgesByShowroomId, setBadgesByShowroomId] = useState<Record<number, Badge[]>>({});
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [allCities, setAllCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedBadgeIds, setSelectedBadgeIds] = useState<Set<number>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    (async () => {
      const [showroomsRes, { data: badgesData }, { data: showroomBadgesData }] =
        await Promise.all([
          supabase
            .from('showrooms')
            .select('id, name, city, description, avatar_url, image_url, shop_type, is_permanent, instagram_handle')
            .eq('publication_status', 'published')
            .order('name'),
          supabase.from('badges').select('*').order('sort_order'),
          supabase.from('showroom_badges').select('showroom_id, badge_id'),
        ]);

      const showroomsList = (showroomsRes.data as Showroom[]) ?? [];
      setShowrooms(showroomsList);

      const cities = [
        ...new Set(
          showroomsList
            .map((s) => s.city?.trim())
            .filter((c): c is string => !!c)
        ),
      ].sort((a, b) => a.localeCompare(b, 'fr'));
      setAllCities(cities);

      const badgesList = (badgesData as Badge[]) ?? [];
      setAllBadges(badgesList);
      const badgeMap = Object.fromEntries(badgesList.map((b) => [b.id, b]));
      const sbList = (showroomBadgesData as { showroom_id: number; badge_id: number }[]) ?? [];
      const badgesByShowroom: Record<number, Badge[]> = {};
      for (const sb of sbList) {
        const badge = badgeMap[sb.badge_id];
        if (badge) {
          if (!badgesByShowroom[sb.showroom_id]) badgesByShowroom[sb.showroom_id] = [];
          badgesByShowroom[sb.showroom_id].push(badge);
        }
      }
      setBadgesByShowroomId(badgesByShowroom);
      setLoading(false);
    })();
  }, []);

  const filteredShowrooms = useMemo(() => {
    let result = showrooms;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          s.city?.toLowerCase().includes(q)
      );
    }

    if (selectedCity) {
      result = result.filter((s) => s.city?.trim() === selectedCity);
    }

    if (selectedBadgeIds.size > 0) {
      result = result.filter((s) => {
        const showroomBadgeIds = new Set((badgesByShowroomId[s.id] ?? []).map((b) => b.id));
        for (const id of selectedBadgeIds) {
          if (!showroomBadgeIds.has(id)) return false;
        }
        return true;
      });
    }

    return result;
  }, [showrooms, searchQuery, selectedCity, selectedBadgeIds, badgesByShowroomId]);

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
    setSelectedCity('');
    setSelectedBadgeIds(new Set());
  };

  const hasActiveFilters = searchQuery.trim() !== '' || selectedCity !== '' || selectedBadgeIds.size > 0;

  return (
    <div className="min-h-screen bg-[#FBFBFD] flex flex-col">
      <LandingHeader />

      <section className="px-4 pt-12 pb-8 sm:pt-16 sm:pb-10 text-center border-b border-black/[0.06]">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-neutral-900 tracking-tight">
          Nos boutiques partenaires
        </h1>
        <p className="mt-3 text-sm sm:text-base text-neutral-500 max-w-lg mx-auto">
          Parcourez les boutiques partenaires de Kraftplace.
        </p>
      </section>

      <section className="sticky top-[calc(2.25rem+57px)] z-40 bg-[#FBFBFD]/95 backdrop-blur-md border-b border-black/[0.06]">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Rechercher une boutique..."
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

            {allCities.length > 0 && (
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className={`appearance-none pl-9 pr-8 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                    selectedCity
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-white text-neutral-700 border-black/[0.08] hover:border-neutral-300'
                  }`}
                >
                  <option value="">Toutes les villes</option>
                  {allCities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
            )}

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
                {filteredShowrooms.length} boutique{filteredShowrooms.length !== 1 ? 's' : ''} trouvée{filteredShowrooms.length !== 1 ? 's' : ''}
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
        ) : filteredShowrooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[30vh] text-center">
            <Store className="h-12 w-12 text-neutral-300 mb-4" />
            {hasActiveFilters ? (
              <>
                <p className="text-neutral-700 font-medium">Aucune boutique ne correspond à vos critères.</p>
                <button
                  onClick={clearFilters}
                  className="mt-3 text-sm text-neutral-600 hover:text-neutral-900 underline underline-offset-2"
                >
                  Effacer les filtres
                </button>
              </>
            ) : (
              <p className="text-neutral-500">Aucune boutique pour le moment.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredShowrooms.map((showroom) => (
              <PublicShowroomCard
                key={showroom.id}
                showroom={showroom}
                badges={badgesByShowroomId[showroom.id] ?? []}
              />
            ))}
          </div>
        )}
      </main>

      <LandingFooter />
    </div>
  );
}
