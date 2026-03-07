'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AnnonceMultiStepForm, type PublicListingData } from '@/components/annonce/AnnonceMultiStepForm';
import { Loader2 } from 'lucide-react';

export default function AnnoncePage() {
  const params = useParams();
  const listingId = params.listingId as string;
  const [data, setData] = useState<PublicListingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/listings/public/${listingId}`);
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          setError((json as { error?: string }).error ?? 'Annonce introuvable');
          return;
        }
        const json = await res.json();
        if (!cancelled) setData(json as PublicListingData);
      } catch {
        if (!cancelled) setError('Chargement impossible');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [listingId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBFBFD] flex flex-col">
        <header className="nav-kraft shrink-0 flex items-center justify-between px-4 py-2.5 sticky top-9 z-50">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-[#1A1A1A] font-semibold tracking-tight kraftplace-wordmark text-base">Kraftplace</span>
            <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider text-[#5c4a38] bg-[#c9b896]/40 border border-[#C4B09A]">Beta</span>
          </Link>
          <Link href="/login" className="text-xs font-medium text-[#1A1A1A]/90 hover:text-[#1A1A1A] transition-colors">Connexion</Link>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" strokeWidth={1.5} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#FBFBFD] flex flex-col">
        <header className="nav-kraft shrink-0 flex items-center justify-between px-4 py-2.5 sticky top-9 z-50">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-[#1A1A1A] font-semibold tracking-tight kraftplace-wordmark text-base">Kraftplace</span>
            <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider text-[#5c4a38] bg-[#c9b896]/40 border border-[#C4B09A]">Beta</span>
          </Link>
          <Link href="/login" className="text-xs font-medium text-[#1A1A1A]/90 hover:text-[#1A1A1A] transition-colors">Connexion</Link>
        </header>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <p className="text-neutral-600">{error ?? 'Annonce introuvable'}</p>
            <Link href="/" className="mt-4 inline-block text-sm font-medium text-neutral-900 hover:underline">
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const id = Number(listingId);
  return (
    <div className="min-h-screen bg-[#FBFBFD] flex flex-col">
      <header className="nav-kraft shrink-0 flex items-center justify-between px-4 py-2.5 sticky top-9 z-50">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-[#1A1A1A] font-semibold tracking-tight kraftplace-wordmark text-base">Kraftplace</span>
          <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider text-[#5c4a38] bg-[#c9b896]/40 border border-[#C4B09A]">
            Beta
          </span>
        </Link>
        <Link
          href="/login"
          className="text-xs font-medium text-[#1A1A1A]/90 hover:text-[#1A1A1A] transition-colors"
        >
          Connexion
        </Link>
      </header>
      <main className="flex-1 pt-8">
        <AnnonceMultiStepForm data={data} listingId={id} />
      </main>
    </div>
  );
}
