'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdminEntity } from '../context/AdminEntityContext';
import {
  Loader2,
  Package,
  Sparkles,
  RefreshCw,
  CheckCircle,
  XCircle,
  MessageSquare,
  X,
} from 'lucide-react';
import type { Brand, Candidature, ShowroomCommissionOption, Message } from '@/lib/supabase';
import { getOrCreateConversationId } from '@/lib/conversations';
import { CandidatureDetailModal } from '../components/CandidatureDetailModal';
import { useMessengerPanel } from '../context/MessengerPanelContext';

type CandidatureWithDetails = Candidature & { brand?: Brand; option?: ShowroomCommissionOption };

function candidatureOptionSummary(opt: ShowroomCommissionOption | null): string {
  if (!opt) return '-';
  const parts: string[] = [];
  if (opt.rent != null && opt.rent > 0) {
    const period = opt.rent_period === 'week' ? '/sem.' : opt.rent_period === 'one_off' ? ' unique' : '/mois';
    parts.push(`${opt.rent}€${period}`);
  }
  if (opt.commission_percent != null) parts.push(`${opt.commission_percent} %`);
  if (opt.description?.trim()) parts.push(opt.description);
  return parts.join(' · ') || 'Option';
}

export default function CurationPage() {
  const { entityType, activeShowroom, userId } = useAdminEntity();
  const { openMessenger } = useMessengerPanel();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [candidatures, setCandidatures] = useState<CandidatureWithDetails[]>([]);
  const [negotiateCandidature, setNegotiateCandidature] = useState<CandidatureWithDetails | null>(null);
  const [negotiateMessage, setNegotiateMessage] = useState('');
  const [detailCandidature, setDetailCandidature] = useState<CandidatureWithDetails | null>(null);
  const [lastMessageByCandidatureId, setLastMessageByCandidatureId] = useState<Record<string, Message>>({});

  const loadCandidatures = useCallback(async () => {
    if (entityType !== 'showroom' || !activeShowroom) return;
    await supabase.rpc('expire_pending_candidatures');
    const { data: list } = await supabase.from('candidatures').select('*').eq('showroom_id', activeShowroom.id).order('created_at', { ascending: false });
    const rows = (list as Candidature[]) ?? [];
    if (rows.length === 0) {
      setCandidatures([]);
      return;
    }
    const brandIds = [...new Set(rows.map((c) => c.brand_id))];
    const optionIds = rows.map((c) => c.showroom_commission_option_id).filter((id): id is number => id != null);
    const { data: brandsData } = await supabase.from('brands').select('id, brand_name, avatar_url').in('id', brandIds);
    const brandMap = Object.fromEntries(((brandsData as Brand[]) ?? []).map((b) => [b.id, b]));
    let optionMap: Record<number, ShowroomCommissionOption> = {};
    if (optionIds.length > 0) {
      const { data: optsData } = await supabase.from('showroom_commission_options').select('*').in('id', optionIds);
      optionMap = Object.fromEntries(((optsData as ShowroomCommissionOption[]) ?? []).map((o) => [o.id, o]));
    }
    setCandidatures(
      rows.map((c) => ({
        ...c,
        brand: brandMap[c.brand_id],
        option: c.showroom_commission_option_id != null ? optionMap[c.showroom_commission_option_id] : undefined,
      }))
    );
  }, [entityType, activeShowroom?.id]);

  useEffect(() => {
    if (entityType !== 'showroom' || !activeShowroom) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadCandidatures().finally(() => setLoading(false));
  }, [loadCandidatures, entityType, activeShowroom]);

  useEffect(() => {
    if (entityType !== 'showroom' || candidatures.length === 0) return;
    (async () => {
      const convIds = await Promise.all(
        [...new Set(candidatures.map((c) => `${c.brand_id}-${c.showroom_id}`))].map((key) => {
          const [bid, sid] = key.split('-').map(Number);
          return getOrCreateConversationId(bid, sid);
        })
      );
      const resolvedConvIds = convIds.filter((id): id is string => id != null);
      const pairToConvId = new Map<string, string>();
      const uniquePairs = [...new Set(candidatures.map((c) => `${c.brand_id}-${c.showroom_id}`))];
      uniquePairs.forEach((key, i) => {
        const id = convIds[i];
        if (id) pairToConvId.set(key, id);
      });
      let lastByCandidature: Record<string, Message> = {};
      if (resolvedConvIds.length > 0) {
        const { data: msgRows } = await supabase
          .from('messages')
          .select('id, conversation_id, content, created_at, message_type')
          .in('conversation_id', resolvedConvIds)
          .order('created_at', { ascending: false });
        const msgs = (msgRows as Message[]) ?? [];
        const lastByConvId: Record<string, Message> = {};
        msgs.forEach((m) => {
          if (!lastByConvId[m.conversation_id]) lastByConvId[m.conversation_id] = m;
        });
        candidatures.forEach((c) => {
          const convId = pairToConvId.get(`${c.brand_id}-${c.showroom_id}`);
          if (convId && lastByConvId[convId]) lastByCandidature[c.id] = lastByConvId[convId];
        });
      }
      setLastMessageByCandidatureId(lastByCandidature);
    })();
  }, [entityType, candidatures]);

  async function handleRefresh() {
    if (!activeShowroom) return;
    setRefreshing(true);
    await loadCandidatures();
    setRefreshing(false);
  }

  async function acceptCandidature(id: string) {
    setSubmitting(true);
    try {
      const { data: cand } = await supabase.from('candidatures').select('brand_id').eq('id', id).single();
      const brandId = (cand as { brand_id?: number } | null)?.brand_id;
      if (typeof brandId === 'number') {
        const { data: row } = await supabase.from('brands').select('credits, reserved_credits').eq('id', brandId).single();
        const c = typeof (row as { credits?: number })?.credits === 'number' ? (row as { credits: number }).credits : 0;
        const r = typeof (row as { reserved_credits?: number })?.reserved_credits === 'number' ? (row as { reserved_credits: number }).reserved_credits : 0;
        await supabase.from('brands').update({ credits: Math.max(0, c - 1), reserved_credits: Math.max(0, r - 1) }).eq('id', brandId);
      }
      await supabase.from('candidatures').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('id', id);
      await loadCandidatures();
    } finally {
      setSubmitting(false);
    }
  }

  async function refuseCandidature(id: string) {
    if (!confirm('Refuser cette candidature ?')) return;
    setSubmitting(true);
    try {
      const { data: cand } = await supabase.from('candidatures').select('brand_id').eq('id', id).single();
      const brandId = (cand as { brand_id?: number } | null)?.brand_id;
      if (typeof brandId === 'number') {
        const { data: row } = await supabase.from('brands').select('reserved_credits').eq('id', brandId).single();
        const r = typeof (row as { reserved_credits?: number })?.reserved_credits === 'number' ? (row as { reserved_credits: number }).reserved_credits : 0;
        await supabase.from('brands').update({ reserved_credits: Math.max(0, r - 1) }).eq('id', brandId);
      }
      await supabase.from('candidatures').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', id);
      await loadCandidatures();
    } finally {
      setSubmitting(false);
    }
  }

  function openNegotiateModal(c: CandidatureWithDetails) {
    setNegotiateCandidature(c);
    setNegotiateMessage('');
  }

  async function sendNegotiateMessage() {
    if (!userId || !negotiateCandidature || !negotiateMessage.trim() || !entityType) return;
    const senderRole: 'brand' | 'boutique' = entityType === 'showroom' ? 'boutique' : 'brand';
    const conversationId = await getOrCreateConversationId(negotiateCandidature.brand_id, negotiateCandidature.showroom_id);
    if (!conversationId) return;
    setSubmitting(true);
    try {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: userId,
        sender_role: senderRole,
        content: negotiateMessage.trim(),
        message_type: 'candidature_action',
        is_read: false,
      });
      setNegotiateCandidature(null);
      setNegotiateMessage('');
      await loadCandidatures();
    } finally {
      setSubmitting(false);
    }
  }

  // Regrouper les candidatures par marque
  const candidaturesByBrand = candidatures.reduce((acc, c) => {
    const bid = c.brand_id;
    if (!acc[bid]) acc[bid] = { brand: c.brand, candidatures: [] as CandidatureWithDetails[] };
    acc[bid].candidatures.push(c);
    return acc;
  }, {} as Record<number, { brand?: Brand; candidatures: CandidatureWithDetails[] }>);

  const brandIdsWithCandidatures = Object.keys(candidaturesByBrand)
    .map(Number)
    .sort((a, b) => {
      const nameA = candidaturesByBrand[a].brand?.brand_name ?? '';
      const nameB = candidaturesByBrand[b].brand?.brand_name ?? '';
      return nameA.localeCompare(nameB);
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" strokeWidth={1.5} />
      </div>
    );
  }

  if (entityType !== 'showroom' || !activeShowroom) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <p className="text-sm font-light text-neutral-500">Sélectionnez une boutique.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">Partenariats</h1>
          <p className="mt-0.5 text-sm font-light text-neutral-500">Candidatures par marque. Ouvrez une conversation pour voir tout l’historique des échanges et envoyer des messages.</p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-black/[0.08] text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} strokeWidth={1.5} />
          Rafraîchir
        </button>
      </div>

      {candidatures.length === 0 && (
        <div className="mt-8 p-8 rounded-[12px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-center">
          <Package className="h-10 w-10 mx-auto text-neutral-300 mb-2" strokeWidth={1.5} />
          <p className="text-sm font-light text-neutral-500">Aucune candidature.</p>
        </div>
      )}

      {brandIdsWithCandidatures.length > 0 && (
        <div className="mt-8 space-y-6">
          <h2 className="text-sm font-semibold text-neutral-700">Candidatures reçues</h2>
          {brandIdsWithCandidatures.map((brandId) => {
            const { brand: brandInfo, candidatures: brandCandidatures } = candidaturesByBrand[brandId];
            const hasPending = brandCandidatures.some((c) => c.status === 'pending');
            return (
              <section key={`c-${brandId}`} className="rounded-[12px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
                <div className="p-4 border-b border-black/[0.06] flex items-center gap-3 flex-wrap">
                  {brandInfo?.avatar_url?.trim() ? (
                    <img src={brandInfo.avatar_url.trim()} alt="" className="w-12 h-12 rounded-full object-cover border border-neutral-200 shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center shrink-0">
                      <Sparkles className="h-6 w-6 text-neutral-600" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-neutral-900">{brandInfo?.brand_name ?? 'Marque'}</h2>
                    <p className="text-sm text-neutral-500">
                      {brandCandidatures.length} candidature{brandCandidatures.length > 1 ? 's' : ''}
                    </p>
                    {brandCandidatures.some((c) => lastMessageByCandidatureId[c.id]) && (
                      <p className="text-sm text-neutral-600 truncate mt-1">
                        Dernier message : {(() => {
                          const cWithMsg = brandCandidatures.find((c) => lastMessageByCandidatureId[c.id]);
                          const msg = cWithMsg && lastMessageByCandidatureId[cWithMsg.id];
                          return msg ? `${msg.content.slice(0, 80)}${msg.content.length > 80 ? '…' : ''}` : '';
                        })()}
                      </p>
                    )}
                  </div>
                  {hasPending && (
                    <span className="shrink-0 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-800">
                      En attente de réponse
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => activeShowroom && openMessenger({ brandId, showroomId: activeShowroom.id, title: brandInfo?.brand_name ?? 'Marque', avatarUrl: brandInfo?.avatar_url })}
                    className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors duration-150"
                  >
                    <MessageSquare className="h-4 w-4" strokeWidth={1.5} />
                    Messagerie
                  </button>
                </div>
                <ul className="divide-y divide-neutral-100">
                  {brandCandidatures.map((c) => (
                    <li key={c.id} className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-neutral-700">
                            {c.showroom_commission_option_id != null ? (
                              <>Option : {candidatureOptionSummary(c.option ?? null)}</>
                            ) : c.negotiation_message ? (
                              <>Négociation : {c.negotiation_message.slice(0, 200)}{c.negotiation_message.length > 200 ? '…' : ''}</>
                            ) : (
                              '-'
                            )}
                          </p>
                          {c.message?.trim() && (
                            <p className="mt-1 text-sm text-neutral-600 italic">&quot;{c.message.slice(0, 150)}{c.message.length > 150 ? '…' : ''}&quot;</p>
                          )}
                          {c.created_at && (
                            <p className="mt-1 text-xs text-neutral-500">Envoyée le {new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          )}
                          {c.status === 'pending' && (c.partnership_start_at || c.partnership_end_at) && (
                            <p className="mt-1 text-xs text-amber-700">
                              Partenariat {c.partnership_start_at && c.partnership_end_at
                                ? `du ${new Date(c.partnership_start_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} au ${new Date(c.partnership_end_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`
                                : c.partnership_end_at
                                  ? `jusqu'au ${new Date(c.partnership_end_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
                                  : `à partir du ${new Date(c.partnership_start_at!).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                            </p>
                          )}
                          {c.status === 'pending' && !c.partnership_start_at && !c.partnership_end_at && c.expires_at && (
                            <p className="mt-1 text-xs text-amber-700">Valable jusqu'au {new Date(c.expires_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          )}
                          {c.status === 'cancelled' && c.expires_at && (
                            <p className="mt-1 text-xs text-neutral-500">Expirée le {new Date(c.expires_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          )}
                          {lastMessageByCandidatureId[c.id] && (
                            <p className="mt-2 text-sm text-neutral-600 truncate">
                              Dernier message : {lastMessageByCandidatureId[c.id].content.slice(0, 80)}
                              {lastMessageByCandidatureId[c.id].content.length > 80 ? '…' : ''}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-medium ${
                            c.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                            c.status === 'accepted' ? 'bg-green-100 text-green-800' :
                            c.status === 'rejected' || c.status === 'cancelled' ? 'bg-neutral-100 text-neutral-600' :
                            'bg-neutral-100 text-neutral-700'
                          }`}>
                            {c.status === 'pending' ? 'En attente' : c.status === 'accepted' ? 'Acceptée' : c.status === 'rejected' ? 'Refusée' : c.status === 'cancelled' ? 'Annulée' : c.status}
                          </span>
                          <button
                            type="button"
                            onClick={() => setDetailCandidature(c)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 text-neutral-700 text-xs font-medium hover:bg-neutral-50"
                          >
                            <MessageSquare className="h-3.5 w-3.5" /> Voir le détail
                          </button>
                          {c.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => acceptCandidature(c.id)}
                                disabled={submitting}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-60"
                              >
                                <CheckCircle className="h-3.5 w-3.5" /> Accepter
                              </button>
                              <button
                                type="button"
                                onClick={() => refuseCandidature(c.id)}
                                disabled={submitting}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs font-medium hover:bg-red-50 disabled:opacity-60"
                              >
                                <XCircle className="h-3.5 w-3.5" /> Refuser
                              </button>
                              <button
                                type="button"
                                onClick={() => openNegotiateModal(c)}
                                disabled={submitting}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 text-neutral-700 text-xs font-medium hover:bg-neutral-50 disabled:opacity-60"
                              >
                                <MessageSquare className="h-3.5 w-3.5" /> Négocier
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {detailCandidature && (
        <CandidatureDetailModal
          candidature={detailCandidature}
          onClose={() => setDetailCandidature(null)}
          viewerSide="showroom"
          onCandidatureUpdated={(updated) => setDetailCandidature(updated)}
        />
      )}

      {negotiateCandidature && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" aria-hidden onClick={() => !submitting && setNegotiateCandidature(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full pointer-events-auto flex flex-col" role="dialog" aria-modal="true">
              <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {negotiateCandidature.brand?.avatar_url?.trim() ? (
                    <img src={negotiateCandidature.brand.avatar_url.trim()} alt="" className="w-10 h-10 rounded-full object-cover border border-neutral-200 shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                      <Sparkles className="h-5 w-5 text-neutral-400" />
                    </div>
                  )}
                  <h2 className="text-lg font-semibold text-neutral-900 truncate">Négocier avec {negotiateCandidature.brand?.brand_name ?? 'la marque'}</h2>
                </div>
                <button type="button" onClick={() => !submitting && setNegotiateCandidature(null)} className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 shrink-0" aria-label="Fermer">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4">
                <label className="block text-sm font-medium text-neutral-900 mb-1">Votre message (contre-proposition, questions…)</label>
                <textarea
                  value={negotiateMessage}
                  onChange={(e) => setNegotiateMessage(e.target.value)}
                  placeholder="Écrivez votre message…"
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none"
                />
              </div>
              <div className="p-4 border-t border-neutral-200 flex gap-2 justify-end">
                <button type="button" onClick={() => setNegotiateCandidature(null)} disabled={submitting} className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-700 font-medium hover:bg-neutral-50">
                  Annuler
                </button>
                <button type="button" onClick={sendNegotiateMessage} disabled={submitting || !negotiateMessage.trim()} className="px-4 py-2 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-2">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Envoyer
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
