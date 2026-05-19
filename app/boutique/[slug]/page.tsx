import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Store, MapPin, Instagram, ExternalLink, ChevronLeft, Clock, Building2 } from 'lucide-react';
import { BadgeIcon } from '@/app/admin/components/BadgeIcon';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';
import type { Showroom, ShowroomCommissionOption, Badge, Category } from '@/lib/supabase';
import { CategoryIcon } from '@/app/admin/components/CategoryPicker';
import { ShareButton } from '@/components/public/ShareButton';
import { CandidatureCTA } from './CandidatureCTA';
import { toSlug, idFromSlug } from '@/lib/slug';
import type { Metadata } from 'next';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');

export const revalidate = 3600;

export async function generateStaticParams() {
  const { data: showrooms } = await supabase.from('showrooms').select('id, name').eq('publication_status', 'published');
  return (showrooms ?? []).map((s: { id: number; name: string }) => ({ slug: toSlug(s.name, s.id) }));
}

type Props = { params: Promise<{ slug: string }> };

async function getShowroom(id: number) {
  const [{ data: showroom }, { data: options }, { data: badgeRows }, { data: allBadges }, { data: catRows }, { data: allCats }] = await Promise.all([
    supabase.from('showrooms').select('*').eq('id', id).eq('publication_status', 'published').single(),
    supabase.from('showroom_commission_options').select('*').eq('showroom_id', id).order('sort_order'),
    supabase.from('showroom_badges').select('badge_id').eq('showroom_id', id),
    supabase.from('badges').select('*').order('sort_order'),
    supabase.from('showroom_categories').select('category_id').eq('showroom_id', id),
    supabase.from('categories').select('*').order('sort_order'),
  ]);
  if (!showroom) return null;

  const badgeIds = new Set((badgeRows ?? []).map((r: { badge_id: number }) => r.badge_id));
  const badges = (allBadges as Badge[] ?? []).filter((b) => badgeIds.has(b.id));

  const categoryIds = new Set((catRows ?? []).map((r: { category_id: number }) => r.category_id));
  const categories = (allCats as Category[] ?? []).filter((c) => categoryIds.has(c.id));

  return { showroom: showroom as Showroom, commissionOptions: (options as ShowroomCommissionOption[]) ?? [], badges, categories };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const numId = idFromSlug(slug);
  if (!numId) return { title: 'Boutique introuvable' };

  const data = await getShowroom(numId);
  if (!data) return { title: 'Boutique introuvable' };

  const { showroom, badges } = data;
  const canonicalSlug = toSlug(showroom.name, numId);
  const shopType = showroom.shop_type === 'ephemeral' ? 'éphémère' : 'permanente';
  const badgeLabels = badges.map((b) => b.label).join(', ');
  const cityLabel = showroom.city?.trim() ?? '';

  const title = cityLabel
    ? `${showroom.name} — Boutique ${shopType} à ${cityLabel} | Kraftplace`
    : `${showroom.name} — Boutique ${shopType} | Kraftplace`;

  const description = showroom.description?.trim()
    ? `${showroom.description.trim().slice(0, 140)}${badgeLabels ? ` — Engagements : ${badgeLabels}` : ''}`
    : `Découvrez ${showroom.name}, boutique ${shopType}${cityLabel ? ` à ${cityLabel}` : ''} sur Kraftplace.${badgeLabels ? ` Engagements : ${badgeLabels}.` : ''}`;

  const ogImage = showroom.image_url?.trim() || undefined;
  const canonicalUrl = `https://kraftplace.fr/boutique/${canonicalSlug}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title, description, type: 'website',
      url: canonicalUrl,
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630, alt: showroom.name }] } : {}),
      siteName: 'Kraftplace',
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title, description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    other: {
      ...(cityLabel ? { 'geo.placename': cityLabel, 'geo.region': 'FR' } : {}),
    },
  };
}

function rentPeriodLabel(period: string | null): string {
  if (period === 'week') return ' / sem.';
  if (period === 'one_off') return ' (unique)';
  return ' / mois';
}

export default async function BoutiquePage({ params }: Props) {
  const { slug } = await params;
  const numId = idFromSlug(slug);
  if (!numId) notFound();

  const data = await getShowroom(numId);
  if (!data) notFound();

  const { showroom, commissionOptions, badges, categories } = data;

  // Redirect malformed slugs (e.g. old /boutique/3 numeric-only URLs)
  const canonicalSlug = toSlug(showroom.name, numId);
  if (slug !== canonicalSlug) redirect(`/boutique/${canonicalSlug}`);

  const isEphemeral = showroom.shop_type === 'ephemeral' || (showroom.shop_type !== 'permanent' && showroom.is_permanent === false);
  const cityLabel = showroom.city?.trim() ?? '';
  const instagramHandle = showroom.instagram_handle?.trim().replace(/^@/, '');
  const canonicalUrl = `https://kraftplace.fr/boutique/${canonicalSlug}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: showroom.name,
    description: showroom.description?.trim() ?? undefined,
    ...(cityLabel ? {
      address: {
        '@type': 'PostalAddress',
        addressLocality: cityLabel,
        addressCountry: 'FR',
        ...(showroom.address?.trim() ? { streetAddress: showroom.address.trim() } : {}),
        ...(showroom.code_postal?.trim() ? { postalCode: showroom.code_postal.trim() } : {}),
      },
    } : {}),
    ...(showroom.image_url?.trim() ? { image: showroom.image_url.trim() } : {}),
    url: canonicalUrl,
    isPartOf: { '@type': 'WebSite', name: 'Kraftplace', url: 'https://kraftplace.fr' },
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Boutiques', item: 'https://kraftplace.fr/boutiques' },
      ...(cityLabel ? [{ '@type': 'ListItem', position: 2, name: cityLabel, item: `https://kraftplace.fr/boutiques?city=${encodeURIComponent(cityLabel)}` }] : []),
      { '@type': 'ListItem', position: cityLabel ? 3 : 2, name: showroom.name },
    ],
  };

  return (
    <div className="min-h-screen bg-[#FBFBFD] flex flex-col">
      <LandingHeader />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <main className="flex-1 w-full px-4 py-8">
        {/* Breadcrumb */}
        <div className="max-w-xl mx-auto mb-4">
          <Link href="/boutiques" className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-700 transition-colors">
            <ChevronLeft className="h-4 w-4" />
            Toutes les boutiques
          </Link>
        </div>

        {/* Card principale */}
        <div className="max-w-xl mx-auto bg-white rounded-3xl overflow-hidden shadow-sm border border-black/[0.05]">

          {/* Hero */}
          <div className="relative h-44 bg-neutral-100 overflow-hidden">
            {showroom.image_url?.trim() ? (
              <img src={showroom.image_url.trim()} alt={showroom.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Store className="h-12 w-12 text-neutral-200" />
              </div>
            )}
          </div>

          {/* Corps centré */}
          <div className="relative z-10 flex flex-col items-center -mt-12 px-6 pb-8">

            {/* Avatar */}
            <div className="w-24 h-24 rounded-2xl bg-white border-4 border-white shadow-md overflow-hidden flex items-center justify-center shrink-0">
              {showroom.avatar_url?.trim() ? (
                <img src={showroom.avatar_url.trim()} alt={showroom.name} className="w-full h-full object-cover" />
              ) : (
                <Store className="h-10 w-10 text-neutral-300" />
              )}
            </div>

            {/* Nom + type + ville */}
            <h1 className="mt-4 text-xl font-bold text-neutral-900 tracking-tight text-center leading-tight">
              {showroom.name}
            </h1>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              {isEphemeral ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                  <Clock className="h-3 w-3" /> Éphémère
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-neutral-50 border border-black/[0.06] px-2.5 py-1 text-xs font-medium text-neutral-600">
                  <Building2 className="h-3 w-3" /> Permanente
                </span>
              )}
              {cityLabel && (
                <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
                  <MapPin className="h-3 w-3" />
                  {cityLabel}{showroom.code_postal?.trim() && <span className="text-neutral-400">({showroom.code_postal.trim()})</span>}
                </span>
              )}
            </div>

            {/* Badges */}
            {badges.length > 0 && (
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {badges.map((b) => (
                  <span key={b.id} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-50 border border-black/[0.06] px-3 py-1.5 text-xs font-medium text-neutral-600">
                    <BadgeIcon badge={b} className="w-4 h-3 shrink-0" />
                    {b.label}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            {showroom.description?.trim() && (
              <p className="mt-5 text-sm text-neutral-500 leading-relaxed text-center max-w-sm">
                {showroom.description.trim()}
              </p>
            )}

            {/* Catégories recherchées */}
            {categories.length > 0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {categories.map((cat) => (
                  <span key={cat.id} className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 border border-violet-100 px-3 py-1.5 text-xs font-medium text-violet-700">
                    <CategoryIcon icon={cat.icon} className="h-3 w-3 shrink-0" />
                    {cat.name}
                  </span>
                ))}
              </div>
            )}

            {/* Instagram */}
            {instagramHandle && (
              <div className="mt-5 w-full">
                <a
                  href={`https://instagram.com/${instagramHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors"
                >
                  <Instagram className="h-4 w-4 shrink-0" />
                  <span className="truncate">@{instagramHandle}</span>
                  <ExternalLink className="h-3 w-3 shrink-0 text-neutral-400" />
                </a>
              </div>
            )}

            {/* Partager */}
            <div className="mt-3 w-full flex justify-center">
              <ShareButton
                title={`${showroom.name} — Boutique sur Kraftplace`}
                text={`Découvrez ${showroom.name}${cityLabel ? ` à ${cityLabel}` : ''} sur Kraftplace`}
                url={canonicalUrl}
              />
            </div>
          </div>

          {/* Conditions de collaboration */}
          {commissionOptions.length > 0 && (
            <>
              <div className="border-t border-neutral-100 mx-6" />
              <div className="px-6 py-6">
                <h2 className="text-sm font-semibold text-neutral-900 mb-4">Conditions de collaboration</h2>
                <div
                  className="flex gap-3 overflow-x-auto pb-1"
                  style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
                >
                  {commissionOptions.map((o) => (
                    <div
                      key={o.id}
                      className="shrink-0 w-44 rounded-2xl border border-black/[0.06] bg-neutral-50 p-4"
                      style={{ scrollSnapAlign: 'start' }}
                    >
                      {o.rent != null && o.rent > 0 && (
                        <p className="text-lg font-bold text-neutral-900 leading-none">
                          {o.rent}€<span className="text-xs font-normal text-neutral-400">{rentPeriodLabel(o.rent_period)}</span>
                        </p>
                      )}
                      {o.commission_percent != null && (
                        <p className={`${o.rent != null && o.rent > 0 ? 'mt-1.5' : ''} text-lg font-bold text-neutral-900 leading-none`}>
                          {o.commission_percent}%<span className="text-xs font-normal text-neutral-400"> commission</span>
                        </p>
                      )}
                      {o.description?.trim() && (
                        <p className="mt-2 text-xs text-neutral-500 leading-relaxed">{o.description.trim()}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* CTA marques */}
          <CandidatureCTA showroomId={numId} showroomSlug={canonicalSlug} />
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
