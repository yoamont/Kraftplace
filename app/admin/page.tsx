'use client';

import Link from 'next/link';
import { useAdminEntity } from './context/AdminEntityContext';
import { Sparkles, Store, Package, Settings, LayoutGrid, ChevronRight, MessageSquare, Building2, Coins, FileText, Search } from 'lucide-react';

const iconClass = 'h-5 w-5 text-neutral-500 shrink-0';

export default function AdminDashboardPage() {
  const { brands, showrooms, entityType, activeBrand, activeShowroom, loading } = useAdminEntity();

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><span className="text-sm font-light text-neutral-500">Chargement…</span></div>;
  }

  if (brands.length === 0 && showrooms.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">Bienvenue</h1>
        <p className="mt-0.5 text-sm font-light text-neutral-500">Choisissez une entité pour commencer.</p>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Link
            href="/admin/onboarding?type=brand"
            className="flex flex-col p-6 rounded-[12px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-shadow duration-200"
          >
            <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-neutral-600" strokeWidth={1.5} />
            </div>
            <h2 className="mt-4 font-semibold text-neutral-900">Marque</h2>
            <p className="mt-1 text-sm font-light text-neutral-500">Catalogue et sourcing.</p>
            <span className="mt-4 inline-flex items-center text-xs font-medium text-neutral-600">Créer <ChevronRight className="ml-0.5 h-3.5 w-3.5" strokeWidth={1.5} /></span>
          </Link>
          <Link
            href="/admin/onboarding?type=showroom"
            className="flex flex-col p-6 rounded-[12px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-shadow duration-200"
          >
            <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center">
              <Store className="h-6 w-6 text-neutral-600" strokeWidth={1.5} />
            </div>
            <h2 className="mt-4 font-semibold text-neutral-900">Boutique</h2>
            <p className="mt-1 text-sm font-light text-neutral-500">Lieu et partenariats.</p>
            <span className="mt-4 inline-flex items-center text-xs font-medium text-neutral-600">Créer <ChevronRight className="ml-0.5 h-3.5 w-3.5" strokeWidth={1.5} /></span>
          </Link>
        </div>
      </div>
    );
  }

  const isBrand = entityType === 'brand' && activeBrand;
  const isShowroom = entityType === 'showroom' && activeShowroom;

  const credits = isBrand && typeof activeBrand.credits === 'number' ? activeBrand.credits : 0;
  const reserved = isBrand && typeof (activeBrand as { reserved_credits?: number }).reserved_credits === 'number' ? (activeBrand as { reserved_credits: number }).reserved_credits : 0;
  const available = credits - reserved;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">
        {isBrand ? activeBrand.brand_name : isShowroom ? activeShowroom.name : 'Dashboard'}
      </h1>
      <p className="mt-0.5 text-sm font-light text-neutral-500">
        {isBrand ? 'Catalogue et explorer.' : isShowroom ? 'Annonces et partenariats.' : 'Sélectionnez une entité.'}
      </p>
      {isBrand && (
        <div className="mt-4">
          {available > 0 ? (
            <Link href="/admin/credits" className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 text-white px-3 py-1.5 text-xs font-medium hover:bg-neutral-800 transition-colors duration-150">
              <Coins className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
              <span>{available} crédit{available !== 1 ? 's' : ''}</span>
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600">
              <Coins className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
              0 crédit · <Link href="/admin/credits" className="underline hover:text-red-700">Recharger</Link>
            </span>
          )}
        </div>
      )}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {isBrand && (
          <>
            <Link href="/admin/brand-config" className="flex items-center gap-4 p-4 rounded-[12px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-shadow duration-200">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center"><Building2 className={iconClass} strokeWidth={1.5} /></div>
              <div className="min-w-0 flex-1">
                <span className="font-medium text-neutral-900">Marque</span>
                <p className="text-xs font-light text-neutral-500 mt-0.5">Profil et identité</p>
              </div>
              <ChevronRight className="h-4 w-4 text-neutral-400 shrink-0" strokeWidth={1.5} />
            </Link>
            <Link href="/admin/products" className="flex items-center gap-4 p-4 rounded-[12px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-shadow duration-200">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center"><Package className={iconClass} strokeWidth={1.5} /></div>
              <div className="min-w-0 flex-1">
                <span className="font-medium text-neutral-900">Catalogue</span>
                <p className="text-xs font-light text-neutral-500 mt-0.5">Produits</p>
              </div>
              <ChevronRight className="h-4 w-4 text-neutral-400 shrink-0" strokeWidth={1.5} />
            </Link>
            <Link href="/admin/discover" className="flex items-center gap-4 p-4 rounded-[12px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-shadow duration-200">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center"><Store className={iconClass} strokeWidth={1.5} /></div>
              <div className="min-w-0 flex-1">
                <span className="font-medium text-neutral-900">Explorer</span>
                <p className="text-xs font-light text-neutral-500 mt-0.5">Boutiques et candidatures</p>
              </div>
              <ChevronRight className="h-4 w-4 text-neutral-400 shrink-0" strokeWidth={1.5} />
            </Link>
            <Link href="/admin/placements" className="flex items-center gap-4 p-4 rounded-[12px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-shadow duration-200">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center"><LayoutGrid className={iconClass} strokeWidth={1.5} /></div>
              <div className="min-w-0 flex-1">
                <span className="font-medium text-neutral-900">Partenariats</span>
                <p className="text-xs font-light text-neutral-500 mt-0.5">Mises en relation</p>
              </div>
              <ChevronRight className="h-4 w-4 text-neutral-400 shrink-0" strokeWidth={1.5} />
            </Link>
            <Link href="/messages" className="flex items-center gap-4 p-4 rounded-[12px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-shadow duration-200">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center"><MessageSquare className={iconClass} strokeWidth={1.5} /></div>
              <div className="min-w-0 flex-1">
                <span className="font-medium text-neutral-900">Messagerie</span>
                <p className="text-xs font-light text-neutral-500 mt-0.5">Échanges avec les boutiques</p>
              </div>
              <ChevronRight className="h-4 w-4 text-neutral-400 shrink-0" strokeWidth={1.5} />
            </Link>
          </>
        )}
        {isShowroom && (
          <>
            <Link href="/admin/showroom-config" className="flex items-center gap-4 p-4 rounded-[12px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-shadow duration-200">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center"><Settings className={iconClass} strokeWidth={1.5} /></div>
              <div className="min-w-0 flex-1">
                <span className="font-medium text-neutral-900">Boutique</span>
                <p className="text-xs font-light text-neutral-500 mt-0.5">Profil et lieu</p>
              </div>
              <ChevronRight className="h-4 w-4 text-neutral-400 shrink-0" strokeWidth={1.5} />
            </Link>
            <Link href="/admin/listings" className="flex items-center gap-4 p-4 rounded-[12px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-shadow duration-200">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center"><FileText className={iconClass} strokeWidth={1.5} /></div>
              <div className="min-w-0 flex-1">
                <span className="font-medium text-neutral-900">Annonces</span>
                <p className="text-xs font-light text-neutral-500 mt-0.5">Sessions et candidatures</p>
              </div>
              <ChevronRight className="h-4 w-4 text-neutral-400 shrink-0" strokeWidth={1.5} />
            </Link>
            <Link href="/admin/browse-brands" className="flex items-center gap-4 p-4 rounded-[12px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-shadow duration-200">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center"><Search className={iconClass} strokeWidth={1.5} /></div>
              <div className="min-w-0 flex-1">
                <span className="font-medium text-neutral-900">Marques</span>
                <p className="text-xs font-light text-neutral-500 mt-0.5">Créateurs et catalogues</p>
              </div>
              <ChevronRight className="h-4 w-4 text-neutral-400 shrink-0" strokeWidth={1.5} />
            </Link>
            <Link href="/admin/curation" className="flex items-center gap-4 p-4 rounded-[12px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-shadow duration-200">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center"><LayoutGrid className={iconClass} strokeWidth={1.5} /></div>
              <div className="min-w-0 flex-1">
                <span className="font-medium text-neutral-900">Partenariats</span>
                <p className="text-xs font-light text-neutral-500 mt-0.5">Candidatures et messagerie</p>
              </div>
              <ChevronRight className="h-4 w-4 text-neutral-400 shrink-0" strokeWidth={1.5} />
            </Link>
            <Link href="/messages" className="flex items-center gap-4 p-4 rounded-[12px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-shadow duration-200">
              <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center"><MessageSquare className={iconClass} strokeWidth={1.5} /></div>
              <div className="min-w-0 flex-1">
                <span className="font-medium text-neutral-900">Messagerie</span>
                <p className="text-xs font-light text-neutral-500 mt-0.5">Échanges avec les marques</p>
              </div>
              <ChevronRight className="h-4 w-4 text-neutral-400 shrink-0" strokeWidth={1.5} />
            </Link>
          </>
        )}
      </div>
      <div className="mt-10 pt-6 border-t border-black/[0.06]">
        <p className="text-xs font-medium text-neutral-500 mb-2">Autre entité</p>
        <div className="flex gap-3 items-center">
          <Link href="/admin/onboarding?type=brand" className="text-xs font-medium text-neutral-600 hover:text-neutral-900 transition-colors">Marque</Link>
          <span className="text-neutral-300">·</span>
          <Link href="/admin/onboarding?type=showroom" className="text-xs font-medium text-neutral-600 hover:text-neutral-900 transition-colors">Boutique</Link>
        </div>
      </div>
    </div>
  );
}
