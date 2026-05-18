import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Package, ArrowLeft, ExternalLink, Instagram, Globe } from 'lucide-react';
import { BadgeIcon } from '@/app/admin/components/BadgeIcon';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';
import type { Brand, Product, Badge } from '@/lib/supabase';
import { ShareButton } from '@/components/public/ShareButton';
import type { Metadata } from 'next';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');

type Props = { params: Promise<{ id: string }> };

async function getBrand(id: number) {
  const [{ data: brand }, { data: products }, { data: badgeRows }, { data: allBadges }] = await Promise.all([
    supabase
      .from('brands')
      .select('*')
      .eq('id', id)
      .single(),
    supabase
      .from('products')
      .select('id, product_name, price, description, image_url')
      .eq('brand_id', id)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('brand_badges')
      .select('badge_id')
      .eq('brand_id', id),
    supabase.from('badges').select('*').order('sort_order'),
  ]);
  if (!brand) return null;

  const badgeIds = new Set((badgeRows ?? []).map((r: { badge_id: number }) => r.badge_id));
  const badges = (allBadges as Badge[] ?? []).filter((b) => badgeIds.has(b.id));

  return {
    brand: brand as Brand,
    products: (products as Product[]) ?? [],
    badges,
  };
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
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://kraftplace.fr/marque/${numId}`,
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630, alt: brand.brand_name }] } : {}),
      siteName: 'Kraftplace',
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    keywords: [
      brand.brand_name,
      'marque artisanale',
      'marque éthique',
      ...badges.map((b) => b.label),
      'Kraftplace',
    ],
  };
}

export default async function MarquePage({ params }: Props) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) notFound();

  const data = await getBrand(numId);
  if (!data) notFound();

  const { brand, products, badges } = data;

  // JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Brand',
    name: brand.brand_name,
    description: brand.description?.trim() ?? undefined,
    ...(brand.image_url?.trim() ? { logo: brand.avatar_url?.trim() || brand.image_url.trim(), image: brand.image_url.trim() } : {}),
    ...(brand.website_url?.trim() ? { url: brand.website_url.trim() } : {}),
    ...(brand.instagram_handle?.trim() ? { sameAs: [`https://instagram.com/${brand.instagram_handle.trim().replace(/^@/, '')}`] } : {}),
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Marques', item: 'https://kraftplace.fr/marques' },
      { '@type': 'ListItem', position: 2, name: brand.brand_name },
    ],
  };

  return (
    <div className="min-h-screen bg-[#FBFBFD] flex flex-col">
      <LandingHeader />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      {/* Breadcrumb */}
      <nav className="max-w-4xl mx-auto w-full px-4 pt-6 pb-2">
        <Link href="/marques" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Toutes les marques
        </Link>
      </nav>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 pb-12">
        {/* Cover image */}
        <div className="rounded-2xl overflow-hidden bg-neutral-100 aspect-[3/1] relative">
          {brand.image_url?.trim() ? (
            <img src={brand.image_url.trim()} alt={brand.brand_name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-300">
              <Package className="h-16 w-16" />
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="flex items-end gap-4 -mt-8 ml-6 relative z-10">
          <div className="w-20 h-20 rounded-full bg-white border-4 border-white shadow-md overflow-hidden flex items-center justify-center shrink-0">
            {brand.avatar_url?.trim() ? (
              <img src={brand.avatar_url.trim()} alt="" className="w-full h-full object-cover" />
            ) : (
              <Package className="h-8 w-8 text-neutral-400" />
            )}
          </div>
        </div>

        <div className="mt-4">
          <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-900 tracking-tight">{brand.brand_name}</h1>

          {/* Partager */}
          <div className="mt-3">
            <ShareButton
              title={`${brand.brand_name} — Marque sur Kraftplace`}
              text={`Découvrez ${brand.brand_name} sur Kraftplace`}
              url={`https://kraftplace.fr/marque/${numId}`}
            />
          </div>

          {/* Badges */}
          {badges.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {badges.map((b) => (
                <span key={b.id} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 border border-black/[0.06] shadow-sm">
                  <BadgeIcon badge={b} className="w-4 h-3 shrink-0 inline-block" />
                  {b.label}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {brand.description?.trim() && (
            <p className="mt-5 text-[15px] text-neutral-700 leading-relaxed font-light max-w-2xl">
              {brand.description.trim()}
            </p>
          )}

          {/* Links: Instagram + Website */}
          <div className="mt-3 flex flex-wrap items-center gap-4">
            {brand.instagram_handle?.trim() && (
              <a
                href={`https://instagram.com/${brand.instagram_handle.trim().replace(/^@/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                <Instagram className="h-4 w-4" />
                @{brand.instagram_handle.trim().replace(/^@/, '')}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            {brand.website_url?.trim() && (
              <a
                href={brand.website_url.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                <Globe className="h-4 w-4" />
                Site web
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Produits */}
        {products.length > 0 && (
          <section className="mt-8">
            <h2 className="text-base font-semibold text-neutral-900 mb-4">
              Produits <span className="text-neutral-400 font-normal text-sm">({products.length})</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => (
                <div key={product.id} className="rounded-xl bg-white border border-black/[0.04] overflow-hidden shadow-sm">
                  <div className="aspect-square bg-neutral-50 overflow-hidden">
                    {product.image_url?.trim() ? (
                      <img src={product.image_url.trim()} alt={product.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-300">
                        <Package className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-neutral-900 truncate">{product.product_name}</p>
                    <p className="text-sm text-neutral-500 mt-0.5">{product.price}€</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="mt-8 rounded-2xl bg-neutral-900 text-white p-6 sm:p-8 text-center">
          <h2 className="text-lg font-semibold">Vous êtes une boutique ?</h2>
          <p className="mt-1.5 text-sm text-neutral-300">Découvrez {brand.brand_name} et invitez cette marque dans votre boutique.</p>
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login?redirect=/admin"
              className="inline-flex items-center gap-2 rounded-full bg-white text-neutral-900 text-sm font-medium px-6 py-3 hover:bg-neutral-100 transition-colors"
            >
              Se connecter
            </Link>
            <Link
              href="/signup?type=showroom"
              className="inline-flex items-center gap-2 rounded-full bg-transparent text-white text-sm font-medium px-6 py-3 border border-white/30 hover:bg-white/10 transition-colors"
            >
              Créer un compte boutique
            </Link>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
