'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Send, MessageCircle, Store, LayoutGrid, CreditCard, Sparkles } from 'lucide-react';
import { ButtonBrand } from '@/components/landing/ButtonBrand';
import { ButtonShowroom } from '@/components/landing/ButtonShowroom';

export default function HomePage() {
  const [user, setUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u ? { id: u.id } : null));
  }, []);

  return (
    <div className="min-h-screen bg-kraft-50 flex flex-col">
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 border-b border-kraft-300 bg-kraft-50/98 backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-3">
          <span className="text-kraft-black font-semibold tracking-tight kraftplace-wordmark text-lg">Kraftplace</span>
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider text-kraft-600 border border-kraft-400 bg-kraft-200">
            Beta
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-3 sm:gap-4">
          <Link
            href={user ? '/admin' : '/login'}
            className="text-sm font-medium text-kraft-800 hover:text-kraft-black underline underline-offset-2"
          >
            Se connecter
          </Link>
          <ButtonShowroom href="/signup?type=showroom">
            <span className="block text-center leading-tight">
              <span className="block font-bold">Je suis une boutique</span>
              <span className="block text-xs font-normal opacity-90">s&apos;inscrire</span>
            </span>
          </ButtonShowroom>
          <ButtonBrand href="/signup?type=brand">
            <span className="block text-center leading-tight">
              <span className="block font-bold">Je suis une marque</span>
              <span className="block text-xs font-normal opacity-90">s&apos;inscrire</span>
            </span>
          </ButtonBrand>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero — esprit Vinted B2B */}
        <section className="px-4 py-16 sm:py-24 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-kraft-black tracking-tight max-w-4xl mx-auto leading-tight">
            Kraftplace, la plateforme qui va vous faire adorer le commerce en direct.
          </h1>
          <p className="mt-6 text-base sm:text-lg text-kraft-700 max-w-2xl mx-auto leading-relaxed">
            Une communauté, des centaines de lieux de vente et des créateurs uniques. Prêt à vous lancer ? Découvrez comment ça marche !
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <ButtonBrand href="/#marques" className="w-full sm:w-auto px-8 py-4 text-base">
              Lancer ma marque
              <Sparkles className="h-5 w-5" />
            </ButtonBrand>
            <ButtonShowroom href="/#boutiques" className="w-full sm:w-auto px-8 py-4 text-base">
              Ouvrir ma sélection
              <Store className="h-5 w-5" />
            </ButtonShowroom>
          </div>

          {/* Sélection immersive Marque / Boutique — design premium */}
          <section className="mt-16 sm:mt-24 lg:mt-28" aria-label="Choisir votre profil">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Carte Marque — atelier minimaliste */}
              <Link
                href="/#marques"
                className="group relative flex min-h-[380px] sm:min-h-[420px] lg:min-h-[520px] overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-kraft-black focus-visible:ring-offset-2"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
                  style={{
                    backgroundImage: 'url(https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&q=80)',
                  }}
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent transition-colors duration-300 group-hover:from-black/92 group-hover:via-black/50"
                  aria-hidden
                />
                <div className="relative z-10 flex flex-col justify-end p-6 sm:p-8 lg:p-10 text-white">
                  <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-white/95 mb-2">
                    Créateurs & marques
                  </p>
                  <p className="mt-2 text-sm sm:text-base text-white/90 leading-relaxed max-w-md font-sans">
                    Propulsez votre marque dans le monde physique. Accédez à une sélection de boutiques curatées et gérez vos partenariats en direct.
                  </p>
                  <span className="mt-6 inline-flex items-center gap-2 w-fit px-5 py-2.5 rounded-full bg-white text-kraft-black border border-kraft-900/30 text-sm font-bold shadow-sm transition-all duration-300 group-hover:bg-kraft-50 group-hover:gap-3">
                    Dénicher des lieux de vente
                    <span className="inline-block transition-transform duration-300 group-hover:translate-x-0.5">→</span>
                  </span>
                </div>
              </Link>

              {/* Carte Boutique — boutique créateur lumineuse */}
              <Link
                href="/#boutiques"
                className="group relative flex min-h-[380px] sm:min-h-[420px] lg:min-h-[520px] overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-kraft-black focus-visible:ring-offset-2"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
                  style={{
                    backgroundImage: 'url(https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=80)',
                  }}
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent transition-colors duration-300 group-hover:from-black/92 group-hover:via-black/50"
                  aria-hidden
                />
                <div className="relative z-10 flex flex-col justify-end p-6 sm:p-8 lg:p-10 text-white">
                  <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-white/95 mb-2">
                    Lieux de vente & showrooms
                  </p>
                  <p className="mt-2 text-sm sm:text-base text-white/90 leading-relaxed max-w-md font-sans">
                    Devenez une destination. Dénichez des créateurs uniques, automatisez vos contrats et dynamisez vos rayons.
                  </p>
                  <span className="mt-6 inline-flex items-center gap-2 w-fit px-5 py-2.5 rounded-full bg-kraft-black text-kraft-off-white text-sm font-bold transition-all duration-300 group-hover:bg-kraft-900 group-hover:gap-3">
                    Dénicher des marques
                    <span className="inline-block transition-transform duration-300 group-hover:translate-x-0.5">→</span>
                  </span>
                </div>
              </Link>
            </div>
          </section>
        </section>

        {/* Parcours Créateur */}
        <section id="marques" className="px-4 py-14 sm:py-20 border-t border-kraft-300 bg-kraft-50 scroll-mt-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-kraft-black tracking-tight">
              Pour les Créateurs
            </h2>
            <p className="mt-2 text-lg font-medium text-kraft-700">
              Vendre en boutique, c’est simple
            </p>
            <div className="mt-10 grid sm:grid-cols-3 gap-8 sm:gap-6">
              <div className="flex flex-col sm:items-center sm:text-center p-6 rounded-2xl bg-white border-2 border-kraft-300 shadow-sm">
                <span className="flex items-center justify-center w-12 h-12 rounded-full bg-kraft-300 text-kraft-900 font-bold text-lg shrink-0">1</span>
                <h3 className="mt-4 font-bold text-kraft-black text-lg">Postulez gratuitement</h3>
                <p className="mt-2 text-sm text-kraft-700 leading-relaxed">
                  Créez votre catalogue en quelques minutes. Parcourez les boutiques, sélectionnez vos dates et envoyez votre candidature en un clic.
                </p>
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-kraft-600">
                    <Send className="h-3.5 w-3.5" /> Candidature en un clic
                  </span>
                </div>
              </div>
              <div className="flex flex-col sm:items-center sm:text-center p-6 rounded-2xl bg-white border-2 border-kraft-300 shadow-sm">
                <span className="flex items-center justify-center w-12 h-12 rounded-full bg-kraft-300 text-kraft-900 font-bold text-lg shrink-0">2</span>
                <h3 className="mt-4 font-bold text-kraft-black text-lg">Discutez et fixez vos conditions</h3>
                <p className="mt-2 text-sm text-kraft-700 leading-relaxed">
                  Échangez directement avec le gérant de la boutique via notre messagerie intégrée. Validez ensemble le loyer ou la commission et signez votre contrat numériquement.
                </p>
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-kraft-600">
                    <MessageCircle className="h-3.5 w-3.5" /> Messagerie intégrée
                  </span>
                </div>
              </div>
              <div className="flex flex-col sm:items-center sm:text-center p-6 rounded-2xl bg-white border-2 border-kraft-300 shadow-sm">
                <span className="flex items-center justify-center w-12 h-12 rounded-full bg-kraft-300 text-kraft-900 font-bold text-lg shrink-0">3</span>
                <h3 className="mt-4 font-bold text-kraft-black text-lg">Jour de paie !</h3>
                <p className="mt-2 text-sm text-kraft-700 leading-relaxed">
                  Vendez vos produits et recevez votre argent en toute sécurité via Stripe Connect dès que la boutique valide la vente.
                </p>
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-kraft-600">
                    <CreditCard className="h-3.5 w-3.5" /> Paiement sécurisé Stripe
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-10 text-center">
              <ButtonBrand href={user ? '/admin' : '/signup?type=brand'} className="px-8 py-4 text-base">
                Dénicher des lieux de vente
                <Sparkles className="h-5 w-5" />
              </ButtonBrand>
            </div>
          </div>
        </section>

        {/* Parcours Boutique */}
        <section id="boutiques" className="px-4 py-14 sm:py-20 border-t border-kraft-300 bg-kraft-100/60 scroll-mt-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-kraft-black tracking-tight">
              Pour les Boutiques
            </h2>
            <p className="mt-2 text-lg font-medium text-kraft-700">
              Sourcez en toute sécurité
            </p>
            <div className="mt-10 grid sm:grid-cols-3 gap-8 sm:gap-6">
              <div className="flex flex-col sm:items-center sm:text-center p-6 rounded-2xl bg-white border-2 border-kraft-300 shadow-sm">
                <span className="flex items-center justify-center w-12 h-12 rounded-full bg-kraft-300 text-kraft-900 font-bold text-lg shrink-0">1</span>
                <h3 className="mt-4 font-bold text-kraft-black text-lg">Trouvez la pépite</h3>
                <p className="mt-2 text-sm text-kraft-700 leading-relaxed">
                  Accédez à une sélection de marques créatives prêtes à exposer chez vous. Filtrez par style, univers ou conditions de vente.
                </p>
              </div>
              <div className="flex flex-col sm:items-center sm:text-center p-6 rounded-2xl bg-white border-2 border-kraft-300 shadow-sm">
                <span className="flex items-center justify-center w-12 h-12 rounded-full bg-kraft-300 text-kraft-900 font-bold text-lg shrink-0">2</span>
                <h3 className="mt-4 font-bold text-kraft-black text-lg">Sélectionnez en un clic</h3>
                <p className="mt-2 text-sm text-kraft-700 leading-relaxed">
                  Recevez des candidatures complètes (photos, prix, documents légaux) et échangez avec les créateurs pour affiner votre sélection.
                </p>
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-kraft-600">
                    <MessageCircle className="h-3.5 w-3.5" /> Tout dans la messagerie
                  </span>
                </div>
              </div>
              <div className="flex flex-col sm:items-center sm:text-center p-6 rounded-2xl bg-white border-2 border-kraft-300 shadow-sm">
                <span className="flex items-center justify-center w-12 h-12 rounded-full bg-kraft-300 text-kraft-900 font-bold text-lg shrink-0">3</span>
                <h3 className="mt-4 font-bold text-kraft-black text-lg">Gérez sans effort</h3>
                <p className="mt-2 text-sm text-kraft-700 leading-relaxed">
                  Centralisez vos contrats et vos paiements sur un seul dashboard. Suivez l’arrivée des collections et commencez à vendre.
                </p>
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase text-kraft-600">
                    <LayoutGrid className="h-3.5 w-3.5" /> Dashboard + Stripe
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-10 text-center">
              <ButtonShowroom href={user ? '/admin' : '/signup?type=showroom'} className="px-8 py-4 text-base">
                Dénicher des marques
                <Store className="h-5 w-5" />
              </ButtonShowroom>
            </div>
          </div>
        </section>

        {/* Bannière de conclusion — Prêt à vous lancer ? */}
        <section className="px-4 py-14 sm:py-20 border-t border-kraft-900 bg-kraft-black text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-kraft-off-white tracking-tight max-w-xl mx-auto">
            Prêt à vous lancer ?
          </h2>
          <p className="mt-3 text-kraft-300 text-sm sm:text-base">
            Rejoignez la communauté. Créateurs et boutiques, tout se passe sur Kraftplace.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row flex-wrap justify-center gap-4">
            <ButtonBrand href={user ? '/admin' : '/signup?type=brand'} className="px-8 py-4 text-base">
              Dénicher des lieux de vente
              <Sparkles className="h-5 w-5" />
            </ButtonBrand>
            <ButtonShowroom href={user ? '/admin' : '/signup?type=showroom'} className="px-8 py-4 text-base border-2 border-kraft-off-white/50 hover:border-kraft-off-white/80">
              Dénicher des marques
              <Store className="h-5 w-5" />
            </ButtonShowroom>
          </div>
        </section>
      </main>

      <footer className="px-4 py-6 border-t border-kraft-300 bg-kraft-100 text-center text-sm text-kraft-700">
        Kraftplace · Mise en relation marques & boutiques
      </footer>
    </div>
  );
}
