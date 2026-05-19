import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Store, Sparkles } from 'lucide-react';
import { BadgeIcon } from '@/app/admin/components/BadgeIcon';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { HomeGalleries } from '@/app/components/HomeGalleries';
import type { Badge } from '@/lib/supabase';
import type { Metadata } from 'next';

export const revalidate = 3600;

const BADGE_DUPLICATES = 3;

export const metadata: Metadata = {
  title: 'Kraftplace — Le commerce engagé',
  description: 'La plateforme B2B qui connecte boutiques indépendantes et marques responsables.',
  alternates: { canonical: 'https://kraftplace.fr' },
  openGraph: {
    title: 'Kraftplace — Le commerce engagé',
    description: 'La plateforme B2B qui connecte boutiques indépendantes et marques responsables.',
    url: 'https://kraftplace.fr',
    siteName: 'Kraftplace',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Kraftplace — Le commerce engagé',
    description: 'La plateforme B2B qui connecte boutiques indépendantes et marques responsables.',
  },
};

export default async function HomePage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

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

  const badges = (badgesData as Badge[]) ?? [];
  const brands = (brandsData as { id: number; brand_name: string | null; description: string | null; avatar_url: string | null; image_url: string | null }[]) ?? [];
  const showrooms = (showroomsData as { id: number; name: string | null; city: string | null; description: string | null; avatar_url: string | null; image_url: string | null; shop_type: string | null; is_permanent: boolean | null }[]) ?? [];

  const badgeMap = Object.fromEntries(badges.map((b) => [b.id, b]));

  const badgesByBrandId: Record<number, Badge[]> = {};
  for (const row of (brandBadgesData as { brand_id: number; badge_id: number }[]) ?? []) {
    const badge = badgeMap[row.badge_id];
    if (badge) {
      if (!badgesByBrandId[row.brand_id]) badgesByBrandId[row.brand_id] = [];
      badgesByBrandId[row.brand_id].push(badge);
    }
  }

  const badgesByShowroomId: Record<number, Badge[]> = {};
  for (const row of (showroomBadgesData as { showroom_id: number; badge_id: number }[]) ?? []) {
    const badge = badgeMap[row.badge_id];
    if (badge) {
      if (!badgesByShowroomId[row.showroom_id]) badgesByShowroomId[row.showroom_id] = [];
      badgesByShowroomId[row.showroom_id].push(badge);
    }
  }

  const allCities = [...new Set(showrooms.map((s) => s.city?.trim()).filter((c): c is string => !!c))].sort((a, b) =>
    a.localeCompare(b, 'fr')
  );

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

      {/* ── GALERIES (client, filtres interactifs) ── */}
      <HomeGalleries
        brands={brands}
        showrooms={showrooms}
        badges={badges}
        badgesByBrandId={badgesByBrandId}
        badgesByShowroomId={badgesByShowroomId}
        allCities={allCities}
      />

      <LandingFooter />
    </div>
  );
}
