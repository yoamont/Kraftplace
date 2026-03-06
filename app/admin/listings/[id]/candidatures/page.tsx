'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAdminEntity } from '../../../context/AdminEntityContext';
import { supabase } from '@/lib/supabase';
import { acceptCandidatureApi, rejectCandidatureApi } from '@/lib/api/candidatures';
import { Loader2, ArrowLeft, MessageSquare, CheckCircle, XCircle, FileText, Package } from 'lucide-react';
import type { Brand, Candidature, ShowroomCommissionOption } from '@/lib/supabase';
import { CandidatureDetailModal } from '../../../components/CandidatureDetailModal';

type CandidatureWithDetails = Candidature & { brand?: Brand; option?: ShowroomCommissionOption };

type ConvRow = {
  id: string;
  brand_id: number;
  brand?: Brand | null;
  /** Candidature pour cette (brand, showroom) si trouvée */
  candidature: CandidatureWithDetails | null;
  /** Statut dérivé des messages : pending | accepted */
  status: 'pending' | 'accepted';
  /** Id du message CANDIDATURE_SENT pour accepter */
  pendingMessageId: string | null;
};

export default function ListingCandidaturesPage() {
  const params = useParams();
  const router = useRouter();
  const listingId = Number(params.id);
  const { entityType, activeShowroom } = useAdminEntity();
  const [listingTitle, setListingTitle] = useState<string>('');
  const [rows, setRows] = useState<ConvRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [detailCandidature, setDetailCandidature] = useState<CandidatureWithDetails | null>(null);

  const load = useCallback(async () => {
    if (entityType !== 'showroom' || !activeShowroom || !listingId || Number.isNaN(listingId)) return;
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
      setRows([]);
      return;
    }

    const brandIds = [...new Set(list.map((c) => c.brand_id))];
    const convIds = list.map((c) => c.id);

    const [brandsRes, candidaturesRes, msgRes] = await Promise.all([
      supabase.from('brands').select('id, brand_name, avatar_url').in('id', brandIds),
      supabase.from('candidatures').select('*').eq('showroom_id', activeShowroom.id).in('brand_id', brandIds).order('created_at', { ascending: false }),
      // Récupérer tous les messages des convs puis filtrer en JS (évite soucis de filtre type côté Supabase)
      supabase.from('messages').select('id, conversation_id, type, created_at').in('conversation_id', convIds).order('created_at', { ascending: true }),
    ]);

    const brandMap = Object.fromEntries(((brandsRes.data as Brand[]) ?? []).map((b) => [b.id, b]));
    const candidaturesRaw = (candidaturesRes.data as Candidature[]) ?? [];
    const optionIds = candidaturesRaw.map((c) => c.showroom_commission_option_id).filter((id): id is number => id != null);
    let optionMap: Record<number, ShowroomCommissionOption> = {};
    if (optionIds.length > 0) {
      const { data: opts } = await supabase.from('showroom_commission_options').select('*').in('id', optionIds);
      optionMap = Object.fromEntries(((opts as ShowroomCommissionOption[]) ?? []).map((o) => [o.id, o]));
    }
    const candidaturesByBrand = new Map<number, CandidatureWithDetails>();
    candidaturesRaw.forEach((c) => {
      if (!candidaturesByBrand.has(c.brand_id)) {
        candidaturesByBrand.set(c.brand_id, {
          ...c,
          brand: brandMap[c.brand_id],
          option: c.showroom_commission_option_id != null ? optionMap[c.showroom_commission_option_id] : undefined,
        });
      }
    });

    const messages = (msgRes.data as { id: string; conversation_id: string; type: string; created_at: string }[]) ?? [];
    const candidatureMessages = messages.filter((m) => m.type === 'CANDIDATURE_SENT' || m.type === 'CANDIDATURE_ACCEPTED');
    const byConv = new Map<string, typeof candidatureMessages>();
    candidatureMessages.forEach((m) => {
      if (!byConv.has(m.conversation_id)) byConv.set(m.conversation_id, []);
      byConv.get(m.conversation_id)!.push(m);
    });

    setRows(
      list.map((c) => {
        const msgs = byConv.get(c.id) ?? [];
        const sentIdx = msgs.findIndex((m) => m.type === 'CANDIDATURE_SENT');
        const acceptedAfter = sentIdx >= 0 && msgs.slice(sentIdx + 1).some((m) => m.type === 'CANDIDATURE_ACCEPTED');
        const status: 'pending' | 'accepted' = acceptedAfter ? 'accepted' : 'pending';
        const pendingMessageId = sentIdx >= 0 ? msgs[sentIdx].id : null;
        const candidature = candidaturesByBrand.get(c.brand_id) ?? null;
        return {
          id: c.id,
          brand_id: c.brand_id,
          brand: brandMap[c.brand_id],
          candidature,
          status,
          pendingMessageId,
        };
      })
    );
  }, [entityType, activeShowroom?.id, listingId, router]);

  useEffect(() => {
    if (entityType !== 'showroom' || !activeShowroom || !listingId || Number.isNaN(listingId)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load, entityType, activeShowroom?.id, listingId, router]);

  const acceptCandidature = async (convId: string, messageId: string | null) => {
    if (!messageId) return;
    const row = rows.find((r) => r.id === convId);
    setSubmitting(true);
    try {
      await acceptCandidatureApi(convId, messageId);
      if (row?.candidature) {
        await supabase.from('candidatures').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('id', row.candidature.id);
      }
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const refuseCandidature = async (convId: string) => {
    if (!confirm('Refuser cette candidature ?')) return;
    setSubmitting(true);
    try {
      await rejectCandidatureApi(convId);
      const row = rows.find((r) => r.id === convId);
      if (row?.candidature) {
        await supabase.from('candidatures').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', row.candidature.id);
      }
      await load();
    } finally {
      setSubmitting(false);
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
      <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">Candidatures · {listingTitle}</h1>
      <p className="mt-0.5 text-sm font-light text-neutral-500">Marques ayant postulé à cette session. Acceptez, refusez ou négociez.</p>

      <ul className="mt-6 space-y-3">
        {rows.length === 0 ? (
          <li className="rounded-[12px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-6 text-center text-sm font-light text-neutral-500">
            Aucune candidature pour cette annonce.
          </li>
        ) : (
          rows.map((r) => (
            <li key={r.id} className="rounded-[12px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {r.brand?.avatar_url?.trim() ? (
                    <img src={r.brand.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover border border-neutral-200 shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-400 text-sm font-medium shrink-0">
                      {(r.brand?.brand_name ?? '?').slice(0, 1)}
                    </div>
                  )}
                  <span className="font-medium text-neutral-900 truncate">{r.brand?.brand_name ?? `Marque #${r.brand_id}`}</span>
                  <span
                    className={`shrink-0 px-2.5 py-0.5 rounded text-xs font-medium ${
                      r.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {r.status === 'pending' ? 'En attente' : 'Acceptée'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {r.status === 'pending' && r.pendingMessageId && (
                    <>
                      <button
                        type="button"
                        onClick={() => acceptCandidature(r.id, r.pendingMessageId!)}
                        disabled={submitting}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-60"
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> Accepter
                      </button>
                      <button
                        type="button"
                        onClick={() => refuseCandidature(r.id)}
                        disabled={submitting}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-700 text-xs font-medium hover:bg-red-50 disabled:opacity-60"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Refuser
                      </button>
                      {activeShowroom && (
                        <Link
                          href={`/messages?conversationId=${r.id}&showroom=${activeShowroom.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-200 text-amber-800 text-xs font-medium hover:bg-amber-50"
                        >
                          <MessageSquare className="h-3.5 w-3.5" /> Négocier
                        </Link>
                      )}
                    </>
                  )}
                  {r.candidature && (
                    <button
                      type="button"
                      onClick={() => setDetailCandidature(r.candidature!)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 text-neutral-700 text-xs font-medium hover:bg-neutral-50"
                    >
                      <FileText className="h-3.5 w-3.5" /> Voir le détail
                    </button>
                  )}
                  <Link
                    href={`/marque/${r.brand_id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 text-neutral-700 text-xs font-medium hover:bg-neutral-50"
                  >
                    <Package className="h-3.5 w-3.5" /> Voir le catalogue
                  </Link>
                  {activeShowroom && (
                    <Link
                      href={`/messages?conversationId=${r.id}&showroom=${activeShowroom.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800"
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Ouvrir la messagerie
                    </Link>
                  )}
                </div>
              </div>
            </li>
          ))
        )}
      </ul>

      {detailCandidature && (
        <CandidatureDetailModal
          candidature={detailCandidature}
          onClose={() => setDetailCandidature(null)}
          viewerSide="showroom"
          onCandidatureUpdated={(updated) => {
            setDetailCandidature((prev) => (prev ? { ...prev, ...updated, brand: prev.brand, option: prev.option } : null));
            load();
          }}
        />
      )}
    </div>
  );
}
