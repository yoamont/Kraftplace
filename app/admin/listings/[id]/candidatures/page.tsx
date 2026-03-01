'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAdminEntity } from '../../../context/AdminEntityContext';
import { supabase } from '@/lib/supabase';
import { Loader2, ArrowLeft, MessageSquare } from 'lucide-react';
import type { Brand } from '@/lib/supabase';

type ConvWithBrand = {
  id: string;
  brand_id: number;
  brand?: Brand | null;
  hasCandidatureSent: boolean;
};

export default function ListingCandidaturesPage() {
  const params = useParams();
  const router = useRouter();
  const listingId = Number(params.id);
  const { entityType, activeShowroom } = useAdminEntity();
  const [listingTitle, setListingTitle] = useState<string>('');
  const [convs, setConvs] = useState<ConvWithBrand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (entityType !== 'showroom' || !activeShowroom || !listingId || Number.isNaN(listingId)) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data: listingRow } = await supabase
        .from('listings')
        .select('title')
        .eq('id', listingId)
        .eq('showroom_id', activeShowroom.id)
        .single();
      if (!listingRow) {
        router.replace('/admin/listings');
        return;
      }
      setListingTitle((listingRow as { title: string }).title ?? 'Annonce');

      const { data: convRows } = await supabase
        .from('conversations')
        .select('id, brand_id')
        .eq('showroom_id', activeShowroom.id)
        .eq('listing_id', listingId);
      const list = (convRows as { id: string; brand_id: number }[]) ?? [];
      if (list.length === 0) {
        setConvs([]);
        setLoading(false);
        return;
      }
      const brandIds = [...new Set(list.map((c) => c.brand_id))];
      const { data: brandsData } = await supabase
        .from('brands')
        .select('id, brand_name, avatar_url')
        .in('id', brandIds);
      const brandMap = Object.fromEntries(((brandsData as Brand[]) ?? []).map((b) => [b.id, b]));

      const convIds = list.map((c) => c.id);
      const { data: msgRows } = await supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', convIds)
        .eq('type', 'CANDIDATURE_SENT');
      const withSent = new Set((msgRows ?? []).map((m: { conversation_id: string }) => m.conversation_id));

      setConvs(
        list.map((c) => ({
          id: c.id,
          brand_id: c.brand_id,
          brand: brandMap[c.brand_id],
          hasCandidatureSent: withSent.has(c.id),
        }))
      );
    })().finally(() => setLoading(false));
  }, [entityType, activeShowroom?.id, listingId, router]);

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
    <div className="max-w-2xl">
      <Link
        href="/admin/listings"
        className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux annonces
      </Link>
      <h1 className="text-xl font-semibold text-neutral-900">Candidatures · {listingTitle}</h1>
      <p className="mt-1 text-sm text-neutral-500">Marques ayant postulé à cette session.</p>

      <ul className="mt-6 space-y-2">
        {convs.length === 0 ? (
          <li className="rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-center text-neutral-500 text-sm">
            Aucune candidature pour cette annonce.
          </li>
        ) : (
          convs.map((c) => (
            <li key={c.id} className="rounded-lg border border-neutral-200 bg-white p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {c.brand?.avatar_url?.trim() ? (
                  <img src={c.brand.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover border border-neutral-200" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-400 text-sm font-medium">
                    {(c.brand?.brand_name ?? '?').slice(0, 1)}
                  </div>
                )}
                <span className="font-medium text-neutral-900 truncate">{c.brand?.brand_name ?? `Marque #${c.brand_id}`}</span>
              </div>
              <Link
                href={`/messages?conversationId=${c.id}`}
                className="inline-flex items-center gap-2 py-2 px-3 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 shrink-0"
              >
                <MessageSquare className="h-4 w-4" />
                Ouvrir la conversation
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
