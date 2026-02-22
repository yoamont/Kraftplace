'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Search, MessageCircle, Package, Zap } from 'lucide-react';

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
        <nav className="flex items-center gap-2">
          {user ? (
            <Link href="/admin" className="px-4 py-2 text-sm font-medium text-kraft-700 hover:text-kraft-black">
              Tableau de bord
            </Link>
          ) : (
            <>
              <Link href="/login" className="px-4 py-2 text-sm font-medium text-kraft-700 hover:text-kraft-black">
                Connexion
              </Link>
              <Link
                href="/signup"
                className="px-5 py-2.5 rounded-lg text-sm font-bold bg-kraft-black text-kraft-off-white hover:bg-kraft-900 transition-colors border-2 border-kraft-black"
              >
                Rejoindre
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero — CRO: valeur claire, CTA principal dominant */}
        <section className="px-4 py-16 sm:py-24 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-kraft-600 mb-4">
            Mise en relation directe · Communauté
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-kraft-black tracking-tight max-w-3xl mx-auto leading-tight">
            Connecter les créateurs aux meilleurs lieux de vente.
          </h1>
          <p className="mt-6 text-base sm:text-lg text-kraft-700 max-w-2xl mx-auto leading-relaxed">
            La première plateforme de mise en relation directe entre marques et boutiques.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={user ? '/admin' : '/signup'}
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 rounded-xl text-base font-bold bg-kraft-black text-kraft-off-white hover:bg-kraft-900 transition-colors shadow-lg border-2 border-kraft-black"
            >
              Rejoindre la communauté
              <Zap className="h-5 w-5" />
            </Link>
            {!user && (
              <Link
                href="/login"
                className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-4 rounded-xl text-base font-semibold border-2 border-kraft-600 text-kraft-700 hover:bg-kraft-200 hover:border-kraft-700 transition-colors"
              >
                J&apos;ai déjà un compte
              </Link>
            )}
          </div>
        </section>

        {/* Le Concept */}
        <section className="px-4 py-14 sm:py-20 border-t border-kraft-300 bg-kraft-100/60">
          <h2 className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-kraft-600 mb-2">
            Le concept
          </h2>
          <p className="text-center text-2xl sm:text-3xl font-bold text-kraft-black tracking-tight mb-12">
            En trois étapes
          </p>
          <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-8 sm:gap-6">
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-kraft-50 border border-kraft-300">
              <div className="w-14 h-14 rounded-xl bg-kraft-300 flex items-center justify-center mb-4">
                <Search className="h-7 w-7 text-kraft-800" />
              </div>
              <h3 className="font-bold text-kraft-black text-lg">Match</h3>
              <p className="mt-2 text-sm text-kraft-700 leading-relaxed">
                Parcourez les profils de marques ou de boutiques.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-kraft-50 border border-kraft-300">
              <div className="w-14 h-14 rounded-xl bg-kraft-300 flex items-center justify-center mb-4">
                <MessageCircle className="h-7 w-7 text-kraft-800" />
              </div>
              <h3 className="font-bold text-kraft-black text-lg">Chat</h3>
              <p className="mt-2 text-sm text-kraft-700 leading-relaxed">
                Discutez directement via notre messagerie intégrée pour fixer vos conditions.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-kraft-50 border border-kraft-300">
              <div className="w-14 h-14 rounded-xl bg-kraft-300 flex items-center justify-center mb-4">
                <Package className="h-7 w-7 text-kraft-800" />
              </div>
              <h3 className="font-bold text-kraft-black text-lg">Expo</h3>
              <p className="mt-2 text-sm text-kraft-700 leading-relaxed">
                Envoyez vos produits et commencez à vendre.
              </p>
            </div>
          </div>
        </section>

        {/* Arguments — confiance, clarté */}
        <section className="px-4 py-14 sm:py-20 border-t border-kraft-300 bg-kraft-50">
          <h2 className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-kraft-600 mb-2">
            Pourquoi nous
          </h2>
          <p className="text-center text-2xl sm:text-3xl font-bold text-kraft-black tracking-tight mb-12">
            Masse critique, ensemble
          </p>
          <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border-2 border-kraft-300 bg-kraft-100 shadow-sm">
              <p className="text-xl font-bold text-kraft-black">Soutien à la plateforme</p>
              <p className="mt-2 text-sm text-kraft-700 leading-relaxed">
                Des frais de service au moment du paiement permettent de faire vivre Kraftplace.
              </p>
            </div>
            <div className="p-6 rounded-2xl border-2 border-kraft-300 bg-kraft-100 shadow-sm">
              <p className="text-xl font-bold text-kraft-black">Direct-to-Boutique</p>
              <p className="mt-2 text-sm text-kraft-700 leading-relaxed">
                Pas d&apos;intermédiaire, vous gérez vos partenariats en toute autonomie.
              </p>
            </div>
            <div className="p-6 rounded-2xl border-2 border-kraft-300 bg-kraft-100 shadow-sm">
              <p className="text-xl font-bold text-kraft-black">Simplicité</p>
              <p className="mt-2 text-sm text-kraft-700 leading-relaxed">
                Un outil de gestion de catalogue et de recherche de lieux tout-en-un.
              </p>
            </div>
          </div>
        </section>

        {/* CTA final — conversion */}
        <section className="px-4 py-14 sm:py-20 border-t border-kraft-400 bg-kraft-black text-kraft-off-white text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-kraft-300 mb-4">
            Rejoignez la communauté
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight max-w-xl mx-auto">
            Marques et boutiques, connectez-vous.
          </h2>
          <div className="mt-8 flex flex-col sm:flex-row flex-wrap justify-center gap-4">
            <Link
              href={user ? '/admin' : '/signup'}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-bold bg-kraft-off-white text-kraft-black hover:bg-kraft-100 border-2 border-kraft-off-white transition-colors"
            >
              Rejoindre la communauté
              <Zap className="h-5 w-5" />
            </Link>
            <Link
              href={user ? '/admin' : '/login'}
              className="inline-flex items-center justify-center px-6 py-4 rounded-xl text-base font-semibold border-2 border-kraft-400 text-kraft-off-white hover:bg-kraft-900 hover:border-kraft-300 transition-colors"
            >
              J&apos;ai déjà un compte
            </Link>
          </div>
        </section>
      </main>

      <footer className="px-4 py-6 border-t border-kraft-300 bg-kraft-100 text-center text-sm text-kraft-700">
        Kraftplace · Mise en relation marques & boutiques
      </footer>
    </div>
  );
}
