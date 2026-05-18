'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Badge, Brand, Product, Showroom } from '@/lib/supabase';
import { Store, Sparkles, Calendar, MessageCircle, Zap, ArrowRight, MapPin, Building2, Clock, Shield, Handshake, Palette } from 'lucide-react';
import { BadgeIcon } from '@/app/admin/components/BadgeIcon';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';

const BADGE_DUPLICATES = 3;

type BrandWithProducts = Pick<Brand, 'id' | 'brand_name' | 'description' | 'avatar_url' | 'image_url'>;
type ShowroomPreview = Pick<Showroom, 'id' | 'name' | 'city' | 'description' | 'avatar_url' | 'image_url' | 'shop_type' | 'is_permanent'>;

export default function HomePage() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [previewBrands, setPreviewBrands] = useState<BrandWithProducts[]>([]);
  const [previewShowrooms, setPreviewShowrooms] = useState<ShowroomPreview[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u ? { id: u.id } : null));
  }, []);

  useEffect(() => {
    supabase
      .from('badges')
      .select('id, slug, label, icon, sort_order')
      .order('sort_order', { ascending: true })
      .then(({ data }) => setBadges((data as Badge[]) ?? []));
  }, []);

  // Fetch preview brands (3 most recent with an image)
  useEffect(() => {
    supabase
      .from('brands')
      .select('id, brand_name, description, avatar_url, image_url')
      .not('image_url', 'is', null)
      .order('brand_name')
      .limit(3)
      .then(({ data }) => setPreviewBrands((data as BrandWithProducts[]) ?? []));
  }, []);

  // Fetch preview showrooms (3 most recent published)
  useEffect(() => {
    supabase
      .from('showrooms')
      .select('id, name, city, description, avatar_url, image_url, shop_type, is_permanent')
      .eq('publication_status', 'published')
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => setPreviewShowrooms((data as ShowroomPreview[]) ?? []));
  }, []);

  return (
    <div className="min-h-screen bg-[#FBFBFD] flex flex-col">
      <LandingHeader />

      {/* ══════════ HERO (inchangé) ══════════ */}
      <section className="flex flex-col items-center justify-center px-4 pt-16 pb-12 sm:pt-20 sm:pb-16">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-neutral-900 tracking-tight max-w-2xl mx-auto leading-[1.2] text-center">
          <span className="font-bold">Kraftplace.</span> Le trait d&apos;union entre{' '}
          <span className="font-bold text-neutral-900">lieux engagés</span> et{' '}
          <span className="font-bold text-neutral-900">marques éthiques</span>.
        </h1>

        {/* Bandeau valeurs animé */}
        {badges.length > 0 && (
          <div className="mt-6 w-full max-w-2xl mx-auto overflow-hidden">
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

        {/* Deux CTA cards */}
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch justify-center gap-6 sm:gap-12 max-w-xl w-full">
          <Link
            href={user ? '/admin' : '/signup?type=brand'}
            className="flex flex-col items-center justify-center text-center rounded-2xl border border-black/[0.06] bg-neutral-100/80 py-6 px-6 sm:py-8 sm:px-8 transition-all duration-200 hover:border-neutral-900 hover:bg-neutral-200/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
          >
            <Sparkles className="h-10 w-10 sm:h-11 sm:w-11 text-neutral-700 mb-3" strokeWidth={1} aria-hidden />
            <span className="text-base sm:text-lg font-semibold text-neutral-900 tracking-tight">Marque</span>
            <p className="mt-1.5 text-[12px] font-normal text-neutral-400 leading-snug max-w-[180px]">
              Trouvez des boutiques qui valorisent votre artisanat.
            </p>
            <span className="mt-4 inline-block rounded-full bg-neutral-900 text-white text-sm font-medium px-4 py-2">
              Créer mon compte
            </span>
          </Link>
          <Link
            href={user ? '/admin' : '/signup?type=showroom'}
            className="flex flex-col items-center justify-center text-center rounded-2xl border border-black/[0.06] bg-neutral-100/80 py-6 px-6 sm:py-8 sm:px-8 transition-all duration-200 hover:border-neutral-900 hover:bg-neutral-200/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
          >
            <Store className="h-10 w-10 sm:h-11 sm:w-11 text-neutral-700 mb-3" strokeWidth={1} aria-hidden />
            <span className="text-base sm:text-lg font-semibold text-neutral-900 tracking-tight">Boutique</span>
            <p className="mt-1.5 text-[12px] font-normal text-neutral-400 leading-snug max-w-[180px]">
              Sourcez des marques qui enrichissent votre univers éthique.
            </p>
            <span className="mt-4 inline-block rounded-full bg-neutral-900 text-white text-sm font-medium px-4 py-2">
              Créer mon compte
            </span>
          </Link>
        </div>
      </section>

      {/* ══════════ APERÇU GALERIES ══════════ */}
      <section className="border-t border-black/[0.06] bg-neutral-50/60">
        <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16">
          {/* Marques */}
          {previewBrands.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg sm:text-xl font-semibold text-neutral-900 tracking-tight">Marques à découvrir</h2>
                <Link href="/marques" className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors">
                  Voir toutes <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {previewBrands.map((brand) => (
                  <Link
                    key={brand.id}
                    href="/marques"
                    className="group rounded-2xl bg-white overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-200"
                  >
                    <div className="aspect-[4/3] bg-neutral-100 relative overflow-hidden">
                      {brand.image_url?.trim() ? (
                        <img
                          src={brand.image_url.trim()}
                          alt={brand.brand_name ?? ''}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-300">
                          <Sparkles className="h-10 w-10" />
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-neutral-100 shrink-0 overflow-hidden flex items-center justify-center relative">
                        {brand.avatar_url?.trim() ? (
                          <img src={brand.avatar_url.trim()} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Sparkles className="h-4 w-4 text-neutral-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-neutral-900 text-sm truncate">{brand.brand_name || 'Marque'}</h3>
                        {brand.description?.trim() && (
                          <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">{brand.description.trim()}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Boutiques */}
          {previewShowrooms.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg sm:text-xl font-semibold text-neutral-900 tracking-tight">Boutiques qui recrutent</h2>
                <Link href="/boutiques" className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors">
                  Voir toutes <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {previewShowrooms.map((showroom) => {
                  const shopType = showroom.shop_type === 'ephemeral' || (showroom.shop_type !== 'permanent' && showroom.is_permanent === false) ? 'ephemeral' : 'permanent';
                  return (
                    <Link
                      key={showroom.id}
                      href="/boutiques"
                      className="group rounded-2xl bg-white overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-200"
                    >
                      <div className="aspect-[4/3] bg-neutral-100 relative overflow-hidden">
                        {showroom.image_url?.trim() ? (
                          <img
                            src={showroom.image_url.trim()}
                            alt={showroom.name ?? ''}
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-300">
                            <Store className="h-10 w-10" />
                          </div>
                        )}
                      </div>
                      <div className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-neutral-100 shrink-0 overflow-hidden flex items-center justify-center relative">
                          {showroom.avatar_url?.trim() ? (
                            <img src={showroom.avatar_url.trim()} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Store className="h-4 w-4 text-neutral-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-neutral-900 text-sm truncate">{showroom.name || 'Boutique'}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            {shopType === 'permanent' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500">
                                <Building2 className="h-3 w-3" /> Permanente
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
                                <Clock className="h-3 w-3" /> Éphémère
                              </span>
                            )}
                            {showroom.city && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500">
                                <MapPin className="h-3 w-3" /> {showroom.city}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ══════════ POURQUOI KRAFTPLACE ══════════ */}
      <section className="border-t border-black/[0.06]">
        <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
          <h2 className="text-xl sm:text-2xl font-semibold text-neutral-900 tracking-tight text-center mb-10">
            Pourquoi Kraftplace ?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="rounded-2xl bg-neutral-50/80 border border-black/[0.04] p-6">
              <Palette className="h-6 w-6 text-neutral-700 mb-3" strokeWidth={1.5} aria-hidden />
              <h3 className="font-semibold text-neutral-900 text-[15px]">Pour les marques</h3>
              <p className="mt-1.5 text-sm text-neutral-600 leading-relaxed font-light">
                Accédez à des lieux triés sur le volet, alignés avec votre démarche artisanale et éthique. Fini le démarchage à froid.
              </p>
            </div>
            <div className="rounded-2xl bg-neutral-50/80 border border-black/[0.04] p-6">
              <Store className="h-6 w-6 text-neutral-700 mb-3" strokeWidth={1.5} aria-hidden />
              <h3 className="font-semibold text-neutral-900 text-[15px]">Pour les boutiques</h3>
              <p className="mt-1.5 text-sm text-neutral-600 leading-relaxed font-light">
                Renouvelez vos étalages avec des marques authentiques qui attirent une clientèle engagée. Recevez des candidatures qualifiées.
              </p>
            </div>
            <div className="rounded-2xl bg-neutral-50/80 border border-black/[0.04] p-6">
              <Shield className="h-6 w-6 text-neutral-700 mb-3" strokeWidth={1.5} aria-hidden />
              <h3 className="font-semibold text-neutral-900 text-[15px]">Confiance</h3>
              <p className="mt-1.5 text-sm text-neutral-600 leading-relaxed font-light">
                Chaque lieu affiche ses engagements. Vous savez exactement avec qui vous collaborez avant de postuler.
              </p>
            </div>
            <div className="rounded-2xl bg-neutral-50/80 border border-black/[0.04] p-6">
              <Handshake className="h-6 w-6 text-neutral-700 mb-3" strokeWidth={1.5} aria-hidden />
              <h3 className="font-semibold text-neutral-900 text-[15px]">Simplicité</h3>
              <p className="mt-1.5 text-sm text-neutral-600 leading-relaxed font-light">
                Candidatez, échangez et validez vos collaborations en quelques messages. Pas de paperasse.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ COMMENT ÇA MARCHE ══════════ */}
      <section className="border-t border-black/[0.06] bg-neutral-50/60">
        <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
          <h2 className="text-xl sm:text-2xl font-semibold text-neutral-900 tracking-tight text-center mb-10">
            Comment ça marche
          </h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-center gap-8 sm:gap-12">
            <div className="flex flex-col items-center text-center max-w-[180px]">
              <div className="w-12 h-12 rounded-full bg-white border border-black/[0.06] flex items-center justify-center shadow-sm mb-3">
                <Calendar className="h-5 w-5 text-neutral-700" strokeWidth={1.5} />
              </div>
              <h3 className="font-semibold text-neutral-900 text-sm">Postulez</h3>
              <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
                Parcourez les lieux et envoyez votre candidature en un clic.
              </p>
            </div>
            <div className="hidden sm:block text-neutral-300 text-lg select-none">→</div>
            <div className="flex flex-col items-center text-center max-w-[180px]">
              <div className="w-12 h-12 rounded-full bg-white border border-black/[0.06] flex items-center justify-center shadow-sm mb-3">
                <MessageCircle className="h-5 w-5 text-neutral-700" strokeWidth={1.5} />
              </div>
              <h3 className="font-semibold text-neutral-900 text-sm">Échangez</h3>
              <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
                Discutez directement via la messagerie et validez les conditions.
              </p>
            </div>
            <div className="hidden sm:block text-neutral-300 text-lg select-none">→</div>
            <div className="flex flex-col items-center text-center max-w-[180px]">
              <div className="w-12 h-12 rounded-full bg-white border border-black/[0.06] flex items-center justify-center shadow-sm mb-3">
                <Zap className="h-5 w-5 text-neutral-700" strokeWidth={1.5} />
              </div>
              <h3 className="font-semibold text-neutral-900 text-sm">Exposez</h3>
              <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
                Installez vos produits en boutique et développez votre réseau.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ CTA FINAL ══════════ */}
      <section className="border-t border-black/[0.06]">
        <div className="max-w-2xl mx-auto px-4 py-14 sm:py-20 text-center">
          <h2 className="text-xl sm:text-2xl font-semibold text-neutral-900 tracking-tight">
            Prêt à donner vie à vos collaborations ?
          </h2>
          <p className="mt-3 text-sm sm:text-base text-neutral-500">
            Rejoignez une communauté qui croit en un commerce engagé.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={user ? '/admin' : '/signup?type=brand'}
              className="inline-flex items-center gap-2 rounded-full bg-neutral-900 text-white text-sm font-medium px-6 py-3 hover:bg-neutral-800 transition-colors"
            >
              <Sparkles className="h-4 w-4" strokeWidth={1.5} />
              Je suis une marque
            </Link>
            <Link
              href={user ? '/admin' : '/signup?type=showroom'}
              className="inline-flex items-center gap-2 rounded-full bg-white text-neutral-900 text-sm font-medium px-6 py-3 border border-black/[0.08] hover:bg-neutral-50 transition-colors"
            >
              <Store className="h-4 w-4" strokeWidth={1.5} />
              Je suis boutique
            </Link>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
