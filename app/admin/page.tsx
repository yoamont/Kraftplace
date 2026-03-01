'use client';

import Link from 'next/link';
import { useAdminEntity } from './context/AdminEntityContext';
import { Sparkles, Store, Package, Settings, LayoutGrid, ChevronRight, MessageSquare, Bell, Building2, Coins } from 'lucide-react';

export default function AdminDashboardPage() {
  const { brands, showrooms, entityType, activeBrand, activeShowroom, loading } = useAdminEntity();

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><span className="text-kraft-700">Chargement…</span></div>;
  }

  if (brands.length === 0 && showrooms.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold text-kraft-black">Bienvenue</h1>
        <p className="mt-1 text-kraft-700 text-sm">Choisissez le type d’entité à créer pour commencer.</p>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Link
            href="/admin/onboarding?type=brand"
            className="flex flex-col p-6 rounded-xl border-2 border-kraft-300 bg-kraft-50 hover:border-kraft-900 transition-colors"
          >
            <div className="w-12 h-12 rounded-lg bg-kraft-100 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-kraft-700" />
            </div>
            <h2 className="mt-4 font-semibold text-kraft-black">Je suis une Marque</h2>
            <p className="mt-1 text-sm text-kraft-700">Créer ma marque et gérer mon catalogue.</p>
            <span className="mt-4 inline-flex items-center text-sm font-medium text-kraft-700">Créer ma marque <ChevronRight className="ml-1 h-4 w-4" /></span>
          </Link>
          <Link
            href="/admin/onboarding?type=showroom"
            className="flex flex-col p-6 rounded-xl border-2 border-kraft-300 bg-kraft-50 hover:border-kraft-900 transition-colors"
          >
            <div className="w-12 h-12 rounded-lg bg-kraft-100 flex items-center justify-center">
              <Store className="h-6 w-6 text-kraft-700" />
            </div>
            <h2 className="mt-4 font-semibold text-kraft-black">Je suis une Boutique</h2>
            <p className="mt-1 text-sm text-kraft-700">Créer mon lieu et recevoir des marques.</p>
            <span className="mt-4 inline-flex items-center text-sm font-medium text-kraft-700">Créer ma boutique <ChevronRight className="ml-1 h-4 w-4" /></span>
          </Link>
        </div>
      </div>
    );
  }

  const isBrand = entityType === 'brand' && activeBrand;
  const isShowroom = entityType === 'showroom' && activeShowroom;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        {isBrand && activeBrand?.avatar_url?.trim() ? (
          <img src={activeBrand.avatar_url.trim()} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-kraft-300 shrink-0" />
        ) : isShowroom && activeShowroom?.avatar_url?.trim() ? (
          <img src={activeShowroom.avatar_url.trim()} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-kraft-300 shrink-0" />
        ) : null}
        <h1 className="text-2xl font-semibold text-kraft-black">
          {isBrand ? activeBrand.brand_name : isShowroom ? activeShowroom.name : 'Dashboard'}
        </h1>
      </div>
      <p className="mt-1 text-kraft-700 text-sm">
        {isBrand ? 'Catalogue et boutiques.' : isShowroom ? 'Configuration et demandes.' : 'Sélectionnez une entité dans le menu.'}
      </p>
      {isBrand && (
        <div className="mt-4 flex items-center gap-2">
          {(() => {
            const credits = typeof activeBrand.credits === 'number' ? activeBrand.credits : 0;
            const reserved = typeof (activeBrand as { reserved_credits?: number }).reserved_credits === 'number' ? (activeBrand as { reserved_credits: number }).reserved_credits : 0;
            const available = credits - reserved;
            return available > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-kraft-100 text-kraft-800 text-sm font-medium">
                <Coins className="h-4 w-4" />
                ✨ {available} candidature{available !== 1 ? 's' : ''} disponible{available !== 1 ? 's' : ''}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-sm font-medium">
                <Coins className="h-4 w-4" />
                0 crédits restants
                <Link href="/admin/credits" className="underline font-semibold hover:text-red-800 ml-0.5">Recharger</Link>
              </span>
            );
          })()}
        </div>
      )}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {isBrand && (
          <>
            <Link href="/admin/brand-config" className="flex items-center gap-4 p-4 rounded-xl border-2 border-kraft-300 bg-kraft-50 hover:border-kraft-400">
              <div className="w-10 h-10 rounded-lg bg-kraft-100 flex items-center justify-center"><Building2 className="h-5 w-5 text-kraft-700" /></div>
              <div className="min-w-0 flex-1">
                <span className="font-medium text-kraft-black">Ma marque</span>
                <p className="text-sm text-kraft-700">Informations et identité de la marque</p>
              </div>
              <ChevronRight className="h-5 w-5 text-kraft-400" />
            </Link>
            <Link href="/admin/products" className="flex items-center gap-4 p-4 rounded-xl border-2 border-kraft-300 bg-kraft-50 hover:border-kraft-400">
              <div className="w-10 h-10 rounded-lg bg-kraft-100 flex items-center justify-center"><Package className="h-5 w-5 text-kraft-700" /></div>
              <div className="min-w-0 flex-1">
                <span className="font-medium text-kraft-black">Mon Catalogue</span>
                <p className="text-sm text-kraft-700">Produits liés à cette marque</p>
              </div>
              <ChevronRight className="h-5 w-5 text-kraft-400" />
            </Link>
            <Link href="/admin/discover" className="flex items-center gap-4 p-4 rounded-xl border-2 border-kraft-300 bg-kraft-50 hover:border-kraft-400">
              <div className="w-10 h-10 rounded-lg bg-kraft-100 flex items-center justify-center"><Store className="h-5 w-5 text-kraft-700" /></div>
              <div className="min-w-0 flex-1">
                <span className="font-medium text-kraft-black">Vendre mes produits</span>
                <p className="text-sm text-kraft-700">Explorer les boutiques et candidater</p>
              </div>
              <ChevronRight className="h-5 w-5 text-kraft-400" />
            </Link>
            <Link href="/admin/placements" className="flex items-center gap-4 p-4 rounded-xl border-2 border-kraft-300 bg-kraft-50 hover:border-kraft-400">
              <div className="w-10 h-10 rounded-lg bg-kraft-100 flex items-center justify-center"><MessageSquare className="h-5 w-5 text-kraft-700" /></div>
              <div className="min-w-0 flex-1">
                <span className="font-medium text-kraft-black">Messagerie</span>
                <p className="text-sm text-kraft-700">Échanges avec les boutiques</p>
              </div>
              <ChevronRight className="h-5 w-5 text-kraft-400" />
            </Link>
          </>
        )}
        {isShowroom && (
          <>
            <Link href="/admin/showroom-config" className="flex items-center gap-4 p-4 rounded-xl border-2 border-kraft-300 bg-kraft-50 hover:border-kraft-400">
              <div className="w-10 h-10 rounded-lg bg-kraft-100 flex items-center justify-center"><Settings className="h-5 w-5 text-kraft-700" /></div>
              <div className="min-w-0 flex-1">
                <span className="font-medium text-kraft-black">Ma boutique</span>
                <p className="text-sm text-kraft-700">Informations et identité de la boutique</p>
              </div>
              <ChevronRight className="h-5 w-5 text-kraft-400" />
            </Link>
            <Link href="/admin/curation" className="flex items-center gap-4 p-4 rounded-xl border-2 border-kraft-300 bg-kraft-50 hover:border-kraft-400">
              <div className="w-10 h-10 rounded-lg bg-kraft-100 flex items-center justify-center"><LayoutGrid className="h-5 w-5 text-kraft-700" /></div>
              <div className="min-w-0 flex-1">
                <span className="font-medium text-kraft-black">Messagerie</span>
                <p className="text-sm text-kraft-700">Échanges avec les marques</p>
              </div>
              <ChevronRight className="h-5 w-5 text-kraft-400" />
            </Link>
          </>
        )}
        {(isBrand || isShowroom) && (
          <Link href="/admin/notifications" className="flex items-center gap-4 p-4 rounded-xl border-2 border-kraft-300 bg-kraft-50 hover:border-kraft-400">
            <div className="w-10 h-10 rounded-lg bg-kraft-100 flex items-center justify-center"><Bell className="h-5 w-5 text-kraft-700" /></div>
            <div className="min-w-0 flex-1">
              <span className="font-medium text-kraft-black">Notifications</span>
              <p className="text-sm text-kraft-700">Mises à jour sur vos échanges</p>
            </div>
            <ChevronRight className="h-5 w-5 text-kraft-400" />
          </Link>
        )}
      </div>
      <div className="mt-10 pt-6 border-t border-kraft-200">
        <p className="text-sm font-medium text-kraft-700 mb-2">Créer une autre entité</p>
        <div className="flex gap-4">
          <Link href="/admin/onboarding?type=brand" className="text-sm text-kraft-700 hover:text-kraft-black underline">Créer une marque</Link>
          <Link href="/admin/onboarding?type=showroom" className="text-sm text-kraft-700 hover:text-kraft-black underline">Créer une boutique</Link>
        </div>
      </div>
    </div>
  );
}
