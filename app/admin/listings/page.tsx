'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAdminEntity } from '../context/AdminEntityContext';
import { supabase } from '@/lib/supabase';
import { Loader2, Plus, FileText, Calendar } from 'lucide-react';
import type { Listing } from '@/lib/supabase';

function formatDate(d: string | null): string {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '-';
  }
}

export default function ListingsPage() {
  const { entityType, activeShowroom } = useAdminEntity();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (entityType !== 'showroom' || !activeShowroom) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('listings')
        .select('*')
        .eq('showroom_id', activeShowroom.id)
        .order('created_at', { ascending: false });
      setListings((data as Listing[]) ?? []);
    })().finally(() => setLoading(false));
  }, [entityType, activeShowroom?.id]);

  if (entityType === 'brand') {
    return (
      <div className="max-w-2xl mx-auto py-8 text-center">
        <p className="text-neutral-600">Cette page est réservée aux boutiques.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-semibold text-neutral-900">Mes Annonces</h1>
        <Link
          href="/admin/listings/new"
          className="inline-flex items-center gap-2 py-2.5 px-4 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800"
        >
          <Plus className="h-4 w-4" />
          Nouvelle annonce
        </Link>
      </div>
      <p className="mt-2 text-sm text-neutral-600">
        Une seule annonce peut être publiée à la fois. Les marques voient uniquement l’annonce publiée sur « Vendre mes produits ».
      </p>

      <div className="mt-6 space-y-4">
        {listings.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-8 text-center">
            <FileText className="h-12 w-12 text-neutral-400 mx-auto mb-3" />
            <p className="text-neutral-700 font-medium">Aucune annonce</p>
            <p className="text-sm text-neutral-500 mt-1">Créez une annonce pour recevoir des candidatures sur une session de vente.</p>
            <Link
              href="/admin/listings/new"
              className="mt-4 inline-flex items-center gap-2 py-2.5 px-4 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800"
            >
              <Plus className="h-4 w-4" />
              Créer une annonce
            </Link>
          </div>
        ) : (
          listings.map((listing) => (
            <article
              key={listing.id}
              className="rounded-xl border border-neutral-200 bg-white p-4 flex flex-wrap items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <h2 className="font-semibold text-neutral-900">{listing.title}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-neutral-500">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      listing.status === 'published'
                        ? 'bg-green-100 text-green-800'
                        : listing.status === 'archived'
                          ? 'bg-neutral-100 text-neutral-600'
                          : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {listing.status === 'published' ? 'Publiée' : listing.status === 'archived' ? 'Archivée' : 'Brouillon'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Partenariat : {formatDate(listing.partnership_start_date)} → {formatDate(listing.partnership_end_date)}
                  </span>
                  <span className="text-neutral-400">
                    Candidatures : {formatDate(listing.application_open_date)} → {formatDate(listing.application_close_date)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/listings/${listing.id}/candidatures`}
                  className="inline-flex items-center gap-2 py-2 px-4 rounded-lg border border-neutral-200 text-neutral-700 text-sm font-medium hover:bg-neutral-50"
                >
                  Voir les candidatures
                </Link>
                <Link
                  href={`/admin/listings/${listing.id}/edit`}
                  className="inline-flex items-center gap-2 py-2 px-4 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800"
                >
                  Modifier
                </Link>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
