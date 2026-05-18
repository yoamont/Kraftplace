import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Store, MapPin, Building2, Clock, ArrowLeft, ExternalLink, Instagram } from 'lucide-react';
import { BadgeIcon } from '@/app/admin/components/BadgeIcon';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';
import type { Showroom, ShowroomCommissionOption, Badge } from '@/lib/supabase';
import { ShareButton } from '@/components/public/ShareButton';
import type { Metadata } from 'next';

// Server-side Supabase client (no cookie needed — public data only)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');

type Props = { params: Promise<{ id: string }> };

async function getShowroom(id: number) {
  const [{ data: showroom }, { data: options }, { data: badgeRows }, { data: allBadges }] = await Promise.all([
    supabase
      .from('showrooms')
      .select('*')
      .eq('id', id)
      .eq('publication_status', 'published')
      .single(),
    supabase
      .from('showroom_commission_options')
      .select('*')
      .eq('showroom_id', id)
      .order('sort_order'),
    supabase
      .from('showroom_badges')
      .select('badge_id')
      .eq('showroom_id', id),
    supabase.from('badges').select('*').order('sort_order'),
  ]);
  if (!showroom) return null;

  const badgeIds = new Set((badgeRows ?? []).map((r: { badge_id: number }) => r.badge_id));
  const badges = (allBadges as Badge[] ?? []).filter((b) => badgeIds.has(b.id));

  return {
    showroom: showroom as Showroom,
    commissionOptions: (options as ShowroomCommissionOption[]) ?? [],
    badges,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return { title: 'Boutique introuvable' };

  const data = await getShowroom(numId);
  if (!data) return { title: 'Boutique introuvable' };

  const { showroom, badges } = data;
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

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://kraftplace.fr/boutique/${numId}`,
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630, alt: showroom.name }] } : {}),
      siteName: 'Kraftplace',
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    other: {
      ...(cityLabel ? { 'geo.placename': cityLabel, 'geo.region': 'FR' } : {}),
    },
  };
}

function rentPeriodLabel(period: string | null): string {
  if (period === 'week') return '/sem.';
  if (period === 'one_off') return ' (unique)';
  return '/mois';
}

export default async function BoutiquePage({ params }: Props) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) notFound();

  const data = await getShowroom(numId);
  if (!data) notFound();

  const { showroom, commissionOptions, badges } = data;
  const shopType = showroom.shop_type === 'ephemeral' || (showroom.shop_type !== 'permanent' && showroom.is_permanent === false) ? 'ephemeral' : 'permanent';
  const cityLabel = showroom.city?.trim() ?? '';

  // JSON-LD structured data
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
    url: `https://kraftplace.fr/boutique/${numId}`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Kraftplace',
      url: 'https://kraftplace.fr',
    },
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

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      {/* Breadcrumb nav */}
      <nav className="max-w-4xl mx-auto w-full px-4 pt-6 pb-2">
        <Link href="/boutiques" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Toutes les boutiques
        </Link>
      </nav>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 pb-12">
        {/* Cover image */}
        <div className="rounded-2xl overflow-hidden bg-neutral-100 aspect-[3/1] relative">
          {showroom.image_url?.trim() ? (
            <img src={showroom.image_url.trim()} alt={showroom.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-300">
              <Store className="h-16 w-16" />
            </div>
          )}
        </div>

        {/* Avatar + nom */}
        <div className="flex items-end gap-4 -mt-8 ml-6 relative z-10">
          <div className="w-20 h-20 rounded-full bg-white border-4 border-white shadow-md overflow-hidden flex items-center justify-center shrink-0">
            {showroom.avatar_url?.trim() ? (
              <img src={showroom.avatar_url.trim()} alt="" className="w-full h-full object-cover" />
            ) : (
              <Store className="h-8 w-8 text-neutral-400" />
            )}
          </div>
        </div>

        <div className="mt-4">
          {/* Nom + type + ville */}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900 tracking-tight">{showroom.name}</h1>
            {shopType === 'permanent' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
                <Building2 className="h-3.5 w-3.5" /> Permanente
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                <Clock className="h-3.5 w-3.5" /> Éphémère
              </span>
            )}
          </div>

          {cityLabel && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-neutral-500">
              <MapPin className="h-4 w-4" /> {cityLabel}
              {showroom.code_postal?.trim() && <span className="text-neutral-400">({showroom.code_postal.trim()})</span>}
            </p>
          )}

          {/* Partager */}
          <div className="mt-4">
            <ShareButton
              title={`${showroom.name} — Boutique sur Kraftplace`}
              text={`Découvrez ${showroom.name}${cityLabel ? ` à ${cityLabel}` : ''} sur Kraftplace`}
              url={`https://kraftplace.fr/boutique/${numId}`}
            />
          </div>

          {/* Badges */}
          {badges.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {badges.map((b) => (
                <span key={b.id} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 border border-black/[0.06] shadow-sm">
                  <BadgeIcon badge={b} className="w-4 h-3 shrink-0 inline-block" />
                  {b.label}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {showroom.description?.trim() && (
            <p className="mt-5 text-[15px] text-neutral-700 leading-relaxed font-light max-w-2xl">
              {showroom.description.trim()}
            </p>
          )}

          {/* Instagram */}
          {showroom.instagram_handle?.trim() && (
            <a
              href={`https://instagram.com/${showroom.instagram_handle.trim().replace(/^@/, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <Instagram className="h-4 w-4" />
              @{showroom.instagram_handle.trim().replace(/^@/, '')}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        {/* Conditions */}
        {commissionOptions.length > 0 && (
          <section className="mt-8 rounded-2xl bg-white border border-black/[0.04] p-6">
            <h2 className="text-base font-semibold text-neutral-900 mb-4">Conditions de collaboration</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {commissionOptions.map((o) => (
                <div key={o.id} className="rounded-xl bg-neutral-50/80 p-4">
                  {o.rent != null && o.rent > 0 && (
                    <p className="text-lg font-semibold text-neutral-900">
                      {o.rent}€<span className="text-sm font-normal text-neutral-500">{rentPeriodLabel(o.rent_period)}</span>
                    </p>
                  )}
                  {o.commission_percent != null && (
                    <p className={`${o.rent != null && o.rent > 0 ? 'mt-1' : ''} text-lg font-semibold text-neutral-900`}>
                      {o.commission_percent}%<span className="text-sm font-normal text-neutral-500"> de commission</span>
                    </p>
                  )}
                  {o.description?.trim() && (
                    <p className="mt-1.5 text-xs text-neutral-500 leading-relaxed">{o.description.trim()}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="mt-8 rounded-2xl bg-neutral-900 text-white p-6 sm:p-8 text-center">
          <h2 className="text-lg font-semibold">Intéressé par cette boutique ?</h2>
          <p className="mt-1.5 text-sm text-neutral-300">Connectez-vous pour candidater ou contacter {showroom.name}.</p>
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/login?redirect=/admin/discover`}
              className="inline-flex items-center gap-2 rounded-full bg-white text-neutral-900 text-sm font-medium px-6 py-3 hover:bg-neutral-100 transition-colors"
            >
              Se connecter pour candidater
            </Link>
            <Link
              href="/signup?type=brand"
              className="inline-flex items-center gap-2 rounded-full bg-transparent text-white text-sm font-medium px-6 py-3 border border-white/30 hover:bg-white/10 transition-colors"
            >
              Créer un compte marque
            </Link>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
