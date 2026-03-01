'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminEntity } from '../context/AdminEntityContext';
import { supabase } from '@/lib/supabase';
import {
  Loader2,
  Plus,
  FileText,
  Calendar,
  PenLine,
  Home,
  MoreVertical,
  Copy,
  ChevronDown,
} from 'lucide-react';
import type { Listing, ListingStatus } from '@/lib/supabase';

function formatDate(d: string | null): string {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '-';
  }
}

type StatusFilter = 'all' | 'published' | 'draft' | 'archived';
type SortBy = 'created_at' | 'partnership_start';

export default function ListingsPage() {
  const router = useRouter();
  const { entityType, activeShowroom } = useAdminEntity();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('partnership_start');
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [confirmPublishId, setConfirmPublishId] = useState<number | null>(null);
  const [moreOpenId, setMoreOpenId] = useState<number | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);

  const fetchListings = useCallback(async () => {
    if (entityType !== 'showroom' || !activeShowroom) return;
    const { data } = await supabase
      .from('listings')
      .select('*')
      .eq('showroom_id', activeShowroom.id)
      .order('created_at', { ascending: false });
    setListings((data as Listing[]) ?? []);
  }, [entityType, activeShowroom?.id]);

  useEffect(() => {
    if (entityType !== 'showroom' || !activeShowroom) {
      setLoading(false);
      return;
    }
    fetchListings().finally(() => setLoading(false));
  }, [entityType, activeShowroom?.id, fetchListings]);

  const filteredAndSorted = listings
    .filter((l) => {
      if (statusFilter === 'all') return true;
      return l.status === statusFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'created_at') {
        const ac = a.created_at ?? '';
        const bc = b.created_at ?? '';
        return bc.localeCompare(ac);
      }
      const as = a.partnership_start_date ?? '';
      const bs = b.partnership_start_date ?? '';
      return as.localeCompare(bs);
    });

  const publishedListing = listings.find((l) => l.status === 'published');

  const setListingStatus = async (id: number, status: ListingStatus, optimistic = true) => {
    if (optimistic) {
      if (status === 'published' && publishedListing && publishedListing.id !== id) {
        setListings((prev) =>
          prev.map((l) =>
            l.id === publishedListing.id ? { ...l, status: 'draft' as const } : l.id === id ? { ...l, status } : l
          )
        );
      } else {
        setListings((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
      }
    }
    setTogglingId(id);
    try {
      if (status === 'published' && publishedListing && publishedListing.id !== id) {
        await supabase.from('listings').update({ status: 'draft' }).eq('id', publishedListing.id);
      }
      await supabase.from('listings').update({ status }).eq('id', id);
    } catch {
      fetchListings();
    } finally {
      setTogglingId(null);
      setConfirmPublishId(null);
    }
  };

  const handleToggle = (listing: Listing) => {
    const nextPublished = listing.status !== 'published';
    if (nextPublished && publishedListing && publishedListing.id !== listing.id) {
      setConfirmPublishId(listing.id);
      return;
    }
    setListingStatus(listing.id, nextPublished ? 'published' : 'draft');
  };

  const handleConfirmPublish = () => {
    const id = confirmPublishId;
    if (!id) return;
    setListingStatus(id, 'published', true);
  };

  const handleDuplicate = async (listing: Listing) => {
    if (!activeShowroom) return;
    setDuplicatingId(listing.id);
    try {
      const { data: created } = await supabase
        .from('listings')
        .insert({
          showroom_id: activeShowroom.id,
          title: `${listing.title} (copie)`,
          status: 'draft',
          partnership_start_date: listing.partnership_start_date,
          partnership_end_date: listing.partnership_end_date,
          application_open_date: listing.application_open_date,
          application_close_date: listing.application_close_date,
        })
        .select('id')
        .single();
      setMoreOpenId(null);
      if (created?.id) router.push(`/admin/listings/${(created as { id: number }).id}/edit`);
      else fetchListings();
    } finally {
      setDuplicatingId(null);
    }
  };

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
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto min-h-[50vh] bg-[#FBFBFD]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">Annonces</h1>
          <p className="mt-0.5 text-sm font-light text-neutral-500">
            Une seule annonce peut être en ligne. Les marques voient l’annonce publiée sur « Vendre mes produits ».
          </p>
        </div>
        <Link
          href="/admin/listings/new"
          className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors duration-150 shrink-0"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          Nouvelle
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mt-6 mb-6">
        <div className="inline-flex rounded-xl p-0.5 bg-neutral-100 border border-black/[0.06]">
          {(['all', 'published', 'draft', 'archived'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === key ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {key === 'all' ? 'Toutes' : key === 'published' ? 'Publiée' : key === 'draft' ? 'Brouillon' : 'Archives'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-black/[0.06] bg-white px-3 py-2 w-full sm:w-auto min-w-0">
          <Calendar className="h-4 w-4 text-neutral-400 shrink-0" strokeWidth={1.5} />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="text-sm font-medium text-neutral-900 bg-transparent border-0 focus:ring-0 focus:outline-none cursor-pointer"
          >
            <option value="partnership_start">Par date de vente</option>
            <option value="created_at">Par date de création</option>
          </select>
          <ChevronDown className="h-4 w-4 text-neutral-400 shrink-0 pointer-events-none" strokeWidth={1.5} />
        </div>
      </div>

      <div className="space-y-4">
        {filteredAndSorted.length === 0 ? (
          <div className="rounded-[12px] border border-black/[0.06] bg-white p-8 text-center">
            <FileText className="h-12 w-12 text-neutral-400 mx-auto mb-3" strokeWidth={1.5} />
            <p className="font-medium text-neutral-900">Aucune annonce</p>
            <p className="text-sm font-light text-neutral-500 mt-1">Créez une session pour recevoir des candidatures.</p>
            <Link
              href="/admin/listings/new"
              className="mt-4 inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors duration-150"
            >
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              Créer
            </Link>
          </div>
        ) : (
          filteredAndSorted.map((listing) => (
            <article
              key={listing.id}
              className="rounded-[12px] border border-black/[0.06] bg-white p-5 transition-colors hover:border-black/[0.08]"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-semibold text-neutral-900 text-lg">{listing.title}</h2>
                    {listing.status !== 'archived' && (
                      <label className="flex items-center gap-2 cursor-pointer shrink-0">
                        <span className="text-sm font-medium text-neutral-700">En ligne sur Kraftplace</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={listing.status === 'published'}
                          disabled={!!togglingId}
                          onClick={() => handleToggle(listing)}
                          className={`relative inline-flex h-6 w-10 shrink-0 rounded-full border border-black/[0.08] transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-900/20 ${
                            listing.status === 'published' ? 'bg-neutral-900' : 'bg-neutral-200'
                          } ${togglingId ? 'opacity-60 pointer-events-none' : ''}`}
                        >
                          <span
                            className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ml-0.5 ${
                              listing.status === 'published' ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        {togglingId === listing.id && (
                          <Loader2 className="h-4 w-4 animate-spin text-neutral-400 shrink-0" strokeWidth={1.5} />
                        )}
                      </label>
                    )}
                    {listing.status === 'archived' && (
                      <span className="text-xs font-medium text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-full">
                        Archivée
                      </span>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-start gap-2 text-sm">
                      <PenLine className="h-4 w-4 text-neutral-400 shrink-0 mt-0.5" strokeWidth={1.5} />
                      <div>
                        <p className="text-neutral-500 font-normal">Candidatures</p>
                        <p className="text-neutral-900 font-medium">
                          du {formatDate(listing.application_open_date)} au {formatDate(listing.application_close_date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <Home className="h-4 w-4 text-neutral-400 shrink-0 mt-0.5" strokeWidth={1.5} />
                      <div>
                        <p className="text-neutral-500 font-normal">Vente</p>
                        <p className="text-neutral-900 font-medium">
                          du {formatDate(listing.partnership_start_date)} au {formatDate(listing.partnership_end_date)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <div className="inline-flex rounded-lg p-0.5 bg-neutral-100 border border-black/[0.06]">
                    <Link
                      href={`/admin/listings/${listing.id}/candidatures`}
                      className="px-3 py-2 rounded-md text-sm font-medium text-neutral-700 hover:bg-white hover:text-neutral-900 transition-colors"
                    >
                      Candidatures
                    </Link>
                    <Link
                      href={`/admin/listings/${listing.id}/edit`}
                      className="px-3 py-2 rounded-md text-sm font-medium text-neutral-700 hover:bg-white hover:text-neutral-900 transition-colors"
                    >
                      Modifier
                    </Link>
                  </div>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setMoreOpenId(moreOpenId === listing.id ? null : listing.id)}
                      className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
                      aria-expanded={moreOpenId === listing.id}
                      aria-haspopup="true"
                    >
                      <MoreVertical className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                    {moreOpenId === listing.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          aria-hidden
                          onClick={() => setMoreOpenId(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 z-20 py-1 rounded-xl border border-black/[0.06] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] min-w-[140px]">
                          <button
                            type="button"
                            onClick={() => handleDuplicate(listing)}
                            disabled={!!duplicatingId}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors text-left"
                          >
                            {duplicatingId === listing.id ? (
                              <Loader2 className="h-4 w-4 animate-spin shrink-0" strokeWidth={1.5} />
                            ) : (
                              <Copy className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                            )}
                            Dupliquer
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {confirmPublishId && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[2px]" aria-hidden onClick={() => setConfirmPublishId(null)} />
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm rounded-[12px] border border-black/[0.06] bg-white p-5 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-publish-title"
          >
            <h3 id="confirm-publish-title" className="font-semibold text-neutral-900 text-lg">
              Publier cette session
            </h3>
            <p className="mt-2 text-sm font-light text-neutral-600">
              Publier cette session désactivera la session actuelle. Continuer ?
            </p>
            <div className="mt-5 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setConfirmPublishId(null)}
                className="px-4 py-2 rounded-xl border border-black/[0.08] text-neutral-700 text-sm font-medium hover:bg-neutral-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmPublish}
                className="px-4 py-2 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800"
              >
                Continuer
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
