'use client';

import Link from 'next/link';
import { Search, MessageCircle, Package, Zap, LayoutGrid, BarChart3, FileCheck } from 'lucide-react';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';

export default function BoutiquesPage() {
  return (
    <div className="min-h-screen bg-kraft-50 flex flex-col">
      <LandingHeader />

      <main className="flex-1">
        {/* Hero Boutique */}
        <section className="px-4 py-16 sm:py-24 text-center border-b border-kraft-300">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-kraft-600 mb-4">
            Pour les boutiques et showrooms
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-kraft-black tracking-tight max-w-3xl mx-auto leading-tight">
            Recevez des marques qui correspondent à votre lieu.
          </h1>
          <p className="mt-6 text-base sm:text-lg text-kraft-700 max-w-2xl mx-auto leading-relaxed">
            Curation simplifiée, dashboard de gestion et candidatures transparentes.
          </p>
          <div className="mt-10">
            <Link
              href="/signup?type=showroom"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-bold bg-kraft-black text-kraft-off-white hover:bg-kraft-900 transition-colors shadow-lg border-2 border-kraft-black"
            >
              Rejoindre la communauté
              <Zap className="h-5 w-5" />
            </Link>
          </div>
        </section>

        {/* Avantages */}
        <section className="px-4 py-14 sm:py-20 border-t border-kraft-300 bg-kraft-100/60">
          <h2 className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-kraft-600 mb-2">
            Vos avantages
          </h2>
          <p className="text-center text-2xl sm:text-3xl font-bold text-kraft-black tracking-tight mb-12">
            Gérez vos partenariats en toute sérénité
          </p>
          <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border-2 border-kraft-300 bg-kraft-50 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-kraft-300 flex items-center justify-center mb-4">
                <LayoutGrid className="h-6 w-6 text-kraft-800" />
              </div>
              <h3 className="font-bold text-kraft-black text-lg">Curation simplifiée</h3>
              <p className="mt-2 text-sm text-kraft-700 leading-relaxed">
                Recevez et triez les candidatures des marques en un clin d’œil. Validez celles qui vous conviennent.
              </p>
            </div>
            <div className="p-6 rounded-2xl border-2 border-kraft-300 bg-kraft-50 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-kraft-300 flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-kraft-800" />
              </div>
              <h3 className="font-bold text-kraft-black text-lg">Dashboard de gestion</h3>
              <p className="mt-2 text-sm text-kraft-700 leading-relaxed">
                Un tableau de bord clair pour suivre vos partenariats, placements et échanges.
              </p>
            </div>
            <div className="p-6 rounded-2xl border-2 border-kraft-300 bg-kraft-50 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-kraft-300 flex items-center justify-center mb-4">
                <FileCheck className="h-6 w-6 text-kraft-800" />
              </div>
              <h3 className="font-bold text-kraft-black text-lg">Transparence des candidatures</h3>
              <p className="mt-2 text-sm text-kraft-700 leading-relaxed">
                Chaque candidature affiche les infos essentielles : marque, produits, conditions. Vous décidez en toute connaissance.
              </p>
            </div>
          </div>
        </section>

        {/* En trois étapes */}
        <section className="px-4 py-14 sm:py-20 border-t border-kraft-300 bg-kraft-50">
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
                Les marques découvrent votre lieu et candidatent. Vous recevez leurs demandes.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-kraft-50 border border-kraft-300">
              <div className="w-14 h-14 rounded-xl bg-kraft-300 flex items-center justify-center mb-4">
                <MessageCircle className="h-7 w-7 text-kraft-800" />
              </div>
              <h3 className="font-bold text-kraft-black text-lg">Chat</h3>
              <p className="mt-2 text-sm text-kraft-700 leading-relaxed">
                Échangez en direct pour valider les conditions et le planning.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-kraft-50 border border-kraft-300">
              <div className="w-14 h-14 rounded-xl bg-kraft-300 flex items-center justify-center mb-4">
                <Package className="h-7 w-7 text-kraft-800" />
              </div>
              <h3 className="font-bold text-kraft-black text-lg">Expo</h3>
              <p className="mt-2 text-sm text-kraft-700 leading-relaxed">
                Les produits arrivent, vous les exposez et vendez. Paiements sécurisés.
              </p>
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="px-4 py-14 sm:py-20 border-t border-kraft-400 bg-kraft-black text-kraft-off-white text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight max-w-xl mx-auto">
            Prêt à rejoindre les boutiques sur Kraftplace ?
          </h2>
          <div className="mt-8">
            <Link
              href="/signup?type=showroom"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-bold bg-kraft-off-white text-kraft-black hover:bg-kraft-100 border-2 border-kraft-off-white transition-colors"
            >
              Rejoindre la communauté
              <Zap className="h-5 w-5" />
            </Link>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
