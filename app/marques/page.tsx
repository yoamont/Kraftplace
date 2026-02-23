'use client';

import Link from 'next/link';
import { Search, MessageCircle, Package, Zap, MapPin, CreditCard } from 'lucide-react';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';

export default function MarquesPage() {
  return (
    <div className="min-h-screen bg-kraft-50 flex flex-col">
      <LandingHeader />

      <main className="flex-1">
        <section className="px-4 py-16 sm:py-24 text-center border-b border-kraft-300">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-kraft-600 mb-4">
            Pour les créateurs et marques
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-kraft-black tracking-tight max-w-3xl mx-auto leading-tight">
            Exposez et vendez vos produits dans les meilleurs lieux.
          </h1>
          <p className="mt-6 text-base sm:text-lg text-kraft-700 max-w-2xl mx-auto leading-relaxed">
            Accédez à un réseau de boutiques, négociez en direct et encaissez en toute sérénité.
          </p>
          <div className="mt-10">
            <Link
              href="/signup?type=brand"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-bold bg-kraft-black text-kraft-off-white hover:bg-kraft-900 transition-colors shadow-lg border-2 border-kraft-black"
            >
              Rejoindre la communauté
              <Zap className="h-5 w-5" />
            </Link>
          </div>
        </section>

        <section className="px-4 py-14 sm:py-20 border-t border-kraft-300 bg-kraft-100/60">
          <h2 className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-kraft-600 mb-2">
            Vos avantages
          </h2>
          <p className="text-center text-2xl sm:text-3xl font-bold text-kraft-black tracking-tight mb-12">
            Tout ce dont vous avez besoin pour développer vos ventes
          </p>
          <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border-2 border-kraft-300 bg-kraft-50 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-kraft-300 flex items-center justify-center mb-4">
                <MapPin className="h-6 w-6 text-kraft-800" />
              </div>
              <h3 className="font-bold text-kraft-black text-lg">Accès aux meilleurs lieux</h3>
              <p className="mt-2 text-sm text-kraft-700 leading-relaxed">
                Parcourez les boutiques et showrooms, candidatez aux lieux qui correspondent à votre marque.
              </p>
            </div>
            <div className="p-6 rounded-2xl border-2 border-kraft-300 bg-kraft-50 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-kraft-300 flex items-center justify-center mb-4">
                <MessageCircle className="h-6 w-6 text-kraft-800" />
              </div>
              <h3 className="font-bold text-kraft-black text-lg">Messagerie directe</h3>
              <p className="mt-2 text-sm text-kraft-700 leading-relaxed">
                Échangez avec les boutiques sans intermédiaire pour fixer conditions et délais.
              </p>
            </div>
            <div className="p-6 rounded-2xl border-2 border-kraft-300 bg-kraft-50 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-kraft-300 flex items-center justify-center mb-4">
                <CreditCard className="h-6 w-6 text-kraft-800" />
              </div>
              <h3 className="font-bold text-kraft-black text-lg">Paiement sécurisé</h3>
              <p className="mt-2 text-sm text-kraft-700 leading-relaxed">
                Encaissement sécurisé via la plateforme pour une relation de confiance avec les lieux.
              </p>
            </div>
          </div>
        </section>

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
                Parcourez les profils de boutiques et choisissez vos lieux préférés.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-kraft-50 border border-kraft-300">
              <div className="w-14 h-14 rounded-xl bg-kraft-300 flex items-center justify-center mb-4">
                <MessageCircle className="h-7 w-7 text-kraft-800" />
              </div>
              <h3 className="font-bold text-kraft-black text-lg">Chat</h3>
              <p className="mt-2 text-sm text-kraft-700 leading-relaxed">
                Discutez directement avec les boutiques pour fixer vos conditions.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-kraft-50 border border-kraft-300">
              <div className="w-14 h-14 rounded-xl bg-kraft-300 flex items-center justify-center mb-4">
                <Package className="h-7 w-7 text-kraft-800" />
              </div>
              <h3 className="font-bold text-kraft-black text-lg">Expo</h3>
              <p className="mt-2 text-sm text-kraft-700 leading-relaxed">
                Envoyez vos produits et commencez à vendre en boutique.
              </p>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:py-20 border-t border-kraft-400 bg-kraft-black text-kraft-off-white text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight max-w-xl mx-auto">
            Prêt à rejoindre les marques sur Kraftplace ?
          </h2>
          <div className="mt-8">
            <Link
              href="/signup?type=brand"
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
