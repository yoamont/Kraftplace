'use client';

import Link from 'next/link';
import { useAdminEntity } from '../context/AdminEntityContext';
import { LayoutGrid, MessageSquare } from 'lucide-react';

/**
 * Mes partenariats - page placeholder.
 * À venir : partenariats acceptés, calendrier des échéances, résumé des demandes en cours.
 */
export default function PlacementsPage() {
  const { entityType, activeBrand, activeShowroom, loading } = useAdminEntity();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <span className="text-kraft-700">Chargement…</span>
      </div>
    );
  }

  const isBrand = entityType === 'brand' && activeBrand;
  const isShowroom = entityType === 'showroom' && activeShowroom;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-kraft-100 flex items-center justify-center">
          <LayoutGrid className="h-6 w-6 text-kraft-700" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-kraft-black">Mes partenariats</h1>
          <p className="text-sm text-kraft-700 mt-0.5">
            {isBrand && 'Vos mises en relation acceptées et vos candidatures en cours.'}
            {isShowroom && 'Les candidatures reçues et vos partenariats actifs.'}
            {!isBrand && !isShowroom && 'Vos partenariats et demandes en cours.'}
          </p>
        </div>
      </div>

      <div className="rounded-xl border-2 border-kraft-200 bg-kraft-50/50 p-6 text-center">
        <p className="text-kraft-800 font-medium mb-2">Vue complète à venir</p>
        <p className="text-sm text-kraft-700 mb-6">
          Nous préparons un tableau de bord avec vos partenariats acceptés, un calendrier des échéances (candidatures, dates d&apos;expo) et un résumé des demandes en cours.
        </p>
        <Link
          href="/messages"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-kraft-900 text-white font-medium hover:bg-kraft-800 transition-colors"
        >
          <MessageSquare className="h-5 w-5" />
          Ouvrir la messagerie
        </Link>
      </div>
    </div>
  );
}
