import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Package, Instagram, Globe, ExternalLink, ChevronLeft } from 'lucide-react';
import { BadgeIcon } from '@/app/admin/components/BadgeIcon';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';
import type { Brand, Product, Badge } from '@/lib/supabase';
import { ShareButton } from '@/components/public/ShareButton';
import type { Metadata } from 'next';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');

export const revalidate = 3600;

export async function generateStaticParams() {
  const { data: brands } = await supabase.from('brands').select('id');
  return (brands ?? []).map((b: { id: number }) => ({ id: String(b.id) }));
}

type Props = { params: Promise<{ id: string }> };

async function getBrand(id: number) {
  const [{ data: brand }, { data: products }, { data: badgeRows }, { data: allBadges }] = await Promise.all([
    supabase.from('brands').select('*').eq('id', id).single(),
    supabase.from('products').select('id, product_name, price, description, image_url').eq('brand_id', id).order('created_at', { ascending: false }).limit(12),
    supabase.from('brand_badges').select('badge_id').eq('brand_id', id),
    supabase.from('badges').select('*').order('sort_order'),
  ]);
  if (!brand) return null;

  const badgeIds = new Set((badgeRows ?? []).map((r: { badge_id: number }) => r.badge_id));
  const badges = (allBadges as Badge[] ?? []).filter((b) => badgeIds.has(b.id));

  return { brand: brand as Brand, products: (products as Product[]) ?? [], badges };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return { title: 'Marque introuvable' };

  const data = await getBrand(numId);
  if (!data) return { title: 'Marque introuvable' };

  const { brand, badges, products } = data;
  const badgeLabels = badges.map((b) => b.label).join(', ');

  const title = `${brand.brand_name} — Marque artisanale${badgeLabels ? ` ${badges[0]?.label}` : ''} | Kraftplace`;
  const description = brand.description?.trim()
    ? `${brand.description.trim().slice(0, 140)}${badgeLabels ? ` — ${badgeLabels}` : ''}`
    : `Découvrez ${brand.brand_name} sur Kraftplace${badgeLabels ? ` — ${badgeLabels}` : ''}.${products.length > 0 ? ` ${products.length} produit${products.length > 1 ? 's' : ''} disponible${products.length > 1 ? 's' : ''}.` : ''}`;
  const ogImage = brand.image_url?.trim() || (products.find((p) => p.image_url?.trim())?.image_url?.trim()) || undefined;

  return {
    title,
    description,
    alternates: { canonical: `https://kraftplace.fr/marque/${numId}` },
    openGraph: {
      title, description, type: 'website',
      url: `https://kraftplace.fr/marque/${numId}`,
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630, alt: brand.brand_name }] } : {}),
      siteName: 'Kraftplace',
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title, description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    keywords: [brand.brand_name, 'marque artisanale', 'marque éthique', ...badges.map((b) => b.label), 'Kraftplace'],
  };
}

export default async function MarquePage({ params }: Props) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) notFound();

  const data = await getBrand(numId);
  if (!data) notFound();

  const { brand, products, badges } = data;

  const sameAs: string[] = [];
  if (brand.instagram_handle?.trim()) sameAs.push(`https://instagram.com/${brand.instagram_handle.trim().replace(/^@/, '')}`);
  if (brand.website_url?.trim()) sameAs.push(brand.website_url.trim());

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: brand.brand_name,
    description: brand.description?.trim() ?? undefined,
    url: brand.website_url?.trim() || `https://kraftplace.fr/marque/${numId}`,
    ...(brand.avatar_url?.trim() ? { logo: brand.avatar_url.trim() } : {}),
    ...(brand.image_url?.trim() ? { image: brand.image_url.trim() } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
    brand: { '@type': 'Brand', name: brand.brand_name },
    ...(products.length > 0 ? {
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: `Produits ${brand.brand_name}`,
        numberOfItems: products.length,
        itemListElement: products.slice(0, 6).map((p, i) => ({
          '@type': 'ListItem', position: i + 1,
          item: {
            '@type': 'Product', name: p.product_name,
            ...(p.image_url?.trim() ? { image: p.image_url.trim() } : {}),
            offers: { '@type': 'Offer', price: p.price, priceCurrency: 'EUR', availability: 'https://schema.org/InStock' },
          },
        })),
      },
    } : {}),
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Marques', item: 'https://kraftplace.fr/marques' },
      { '@type': 'ListItem', position: 2, name: brand.brand_name },
    ],
  };

  const instagramHandle = brand.instagram_handle?.trim().replace(/^@/, '');

  return (
    <div className="min-h-screen bg-[#FBFBFD] flex flex-col">
      <LandingHeader />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <main className="flex-1 w-full px-4 py-8">
        {/* Breadcrumb */}
        <div className="max-w-xl mx-auto mb-4">
          <Link href="/marques" className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-700 transition-colors">
            <ChevronLeft className="h-4 w-4" />
            Toutes les marques
          </Link>
        </div>

        {/* Card principale */}
        <div className="max-w-xl mx-auto bg-white rounded-3xl overflow-hidden shadow-sm border border-black/[0.05]">

          {/* Hero */}
          <div className="relative h-44 bg-neutral-100 overflow-hidden">
            {brand.image_url?.trim() ? (
              <img src={brand.image_url.trim()} alt={brand.brand_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-12 w-12 text-neutral-200" />
              </div>
            )}
          </div>

          {/* Corps centré */}
          <div className="relative z-10 flex flex-col items-center -mt-12 px-6 pb-8">

            {/* Avatar */}
            <div className="w-24 h-24 rounded-2xl bg-white border-4 border-white shadow-md overflow-hidden flex items-center justify-center shrink-0">
              {brand.avatar_url?.trim() ? (
                <img src={brand.avatar_url.trim()} alt={brand.brand_name} className="w-full h-full object-cover" />
              ) : (
                <Package className="h-10 w-10 text-neutral-300" />
              )}
            </div>

            {/* Nom */}
            <h1 className="mt-4 text-xl font-bold text-neutral-900 tracking-tight text-center leading-tight">
              {brand.brand_name}
            </h1>

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
            {brand.description?.trim() && (
              <p className="mt-5 text-sm text-neutral-500 leading-relaxed text-center max-w-sm">
                {brand.description.trim()}
              </p>
            )}

            {/* Liens Instagram + Site web */}
            {(instagramHandle || brand.website_url?.trim()) && (
              <div className="mt-5 flex gap-2.5 w-full">
                {instagramHandle && (
                  <a
                    href={`https://instagram.com/${instagramHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors"
                  >
                    <Instagram className="h-4 w-4 shrink-0" />
                    <span className="truncate">@{instagramHandle}</span>
                  </a>
                )}
                {brand.website_url?.trim() && (
                  <a
                    href={brand.website_url.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-black/[0.08] text-neutral-700 text-sm font-medium hover:bg-neutral-50 transition-colors"
                  >
                    <Globe className="h-4 w-4 shrink-0" />
                    Site web
                    <ExternalLink className="h-3 w-3 shrink-0 text-neutral-400" />
                  </a>
                )}
              </div>
            )}

            {/* Partager */}
            <div className="mt-3 w-full flex justify-center">
              <ShareButton
                title={`${brand.brand_name} — Marque sur Kraftplace`}
                text={`Découvrez ${brand.brand_name} sur Kraftplace`}
                url={`https://kraftplace.fr/marque/${numId}`}
              />
            </div>
          </div>

          {/* Produits */}
          {products.length > 0 && (
            <>
              <div className="border-t border-neutral-100 mx-6" />
              <div className="px-6 py-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-neutral-900">
                    Produits <span className="text-neutral-400 font-normal">({products.length})</span>
                  </h2>
                  {products.length > 3 && (
                    <span className="text-xs text-neutral-400">Défiler →</span>
                  )}
                </div>
                <div
                  className="flex gap-3 overflow-x-auto pb-1"
                  style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
                >
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="shrink-0 w-36 rounded-2xl overflow-hidden border border-black/[0.05] bg-neutral-50"
                      style={{ scrollSnapAlign: 'start' }}
                    >
                      <div className="aspect-square overflow-hidden bg-neutral-100">
                        {product.image_url?.trim() ? (
                          <img src={product.image_url.trim()} alt={product.product_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-6 w-6 text-neutral-300" />
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-xs font-medium text-neutral-900 truncate">{product.product_name}</p>
                        <p className="text-xs text-neutral-400 mt-0.5">{product.price} €</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* CTA boutiques */}
          <div className="mx-6 mb-6 p-6 rounded-2xl bg-neutral-900 text-white text-center">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400 mb-2">Vous êtes une boutique ?</p>
            <p className="text-sm font-semibold leading-snug">
              Invitez {brand.brand_name}<br />dans votre espace
            </p>
            <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <Link
                href="/login?redirect=/admin"
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-white text-neutral-900 text-sm font-semibold hover:bg-neutral-100 transition-colors"
              >
                Se connecter
              </Link>
              <Link
                href="/signup?type=showroom"
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 rounded-full border border-white/20 text-white text-sm font-medium hover:bg-white/10 transition-colors"
              >
                Créer un compte boutique
              </Link>
            </div>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
