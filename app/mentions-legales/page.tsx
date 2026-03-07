'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1A1A1A]">
      <div className="max-w-2xl mx-auto px-4 py-10 sm:py-14">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[#1A1A1A]/70 hover:text-[#1A1A1A] transition-colors mb-10"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          Retour à l&apos;accueil
        </Link>

        <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-[#1A1A1A] mb-2">
          Mentions légales
        </h1>
        <p className="text-sm text-[#1A1A1A]/60 mb-12">
          Dernière mise à jour · Version pilote
        </p>

        <article className="space-y-12 text-[#1A1A1A]/90 leading-relaxed">
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#1A1A1A]/50 mb-4">
              Éditeur du site
            </h2>
            <p className="text-base sm:text-lg font-light">
              Le site Kraftplace est édité par <strong className="font-medium text-[#1A1A1A]">[Prénom Nom]</strong>, agissant en qualité de particulier dans le cadre d&apos;un test de concept (MVP).
            </p>
            <p className="mt-3 text-base">
              Contact :{' '}
              <a
                href="mailto:contact@exemple.fr"
                className="text-[#1A1A1A] underline underline-offset-2 hover:no-underline"
              >
                [Ton Email Professionnel]
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#1A1A1A]/50 mb-4">
              Hébergement
            </h2>
            <p className="text-base sm:text-lg font-light">
              Le site est hébergé par <strong className="font-medium text-[#1A1A1A]">Vercel Inc.</strong>
            </p>
            <p className="mt-2 text-sm text-[#1A1A1A]/70">
              Adresse : 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis.
            </p>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#1A1A1A]/50 mb-4">
              Propriété intellectuelle
            </h2>
            <p className="text-base sm:text-lg font-light">
              L&apos;ensemble des éléments graphiques, la structure et le contenu du site Kraftplace sont protégés par le droit d&apos;auteur.
            </p>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#1A1A1A]/50 mb-4">
              Note sur la phase de test
            </h2>
            <p className="text-base sm:text-lg font-light">
              Kraftplace est actuellement en phase de lancement expérimental. Aucune transaction financière réelle n&apos;est traitée en dehors du protocole sécurisé Stripe Connect. L&apos;immatriculation de l&apos;entreprise est en cours de finalisation.
            </p>
          </section>

          <section className="pt-6 border-t border-[#1A1A1A]/10">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#1A1A1A]/50 mb-4">
              Note de confiance
            </h2>
            <p className="text-base sm:text-lg font-light">
              <strong className="font-medium text-[#1A1A1A]">Kraftplace est en version Beta.</strong>
              <br />
              Nous lançons ce pilote pour connecter les meilleurs lieux engagés avec des marques éthiques. Nous finalisons actuellement nos démarches administratives. En attendant, profitez d&apos;un accès privilégié et aidez-nous à bâtir le futur du commerce en direct.
            </p>
          </section>
        </article>

        <p className="mt-14 pt-8 border-t border-[#1A1A1A]/10 text-center text-xs text-[#1A1A1A]/50">
          Kraftplace · Mise en relation marques & boutiques
        </p>
      </div>
    </div>
  );
}
