'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Loader2, Sparkles, Store, Send, Pencil, CheckCircle, XCircle, Handshake } from 'lucide-react';
import type { Candidature, ShowroomCommissionOption } from '@/lib/supabase';
import { useAdminEntity } from '../context/AdminEntityContext';
import { MessageList } from './MessageList';
import { getOrCreateConversationId } from '@/lib/conversations';

type BrandRow = { id: number; brand_name: string; owner_id: string; avatar_url?: string | null };
type ShowroomRow = { id: number; name: string; owner_id: string; avatar_url?: string | null };

type CandidatureDetail = Candidature & { showroom?: { name?: string }; brand?: { brand_name?: string }; option?: ShowroomCommissionOption };

function formatOptionLabel(opt: ShowroomCommissionOption): string {
  const parts: string[] = [];
  if (opt.rent != null && opt.rent > 0) {
    const period = opt.rent_period === 'week' ? '/sem.' : opt.rent_period === 'one_off' ? ' unique' : '/mois';
    parts.push(`${opt.rent}€${period}`);
  }
  if (opt.commission_percent != null) parts.push(`${opt.commission_percent} %`);
  if (opt.description?.trim()) parts.push(opt.description.trim());
  return parts.join(' · ') || 'Option';
}

export function CandidatureDetailModal({
  candidature,
  onClose,
  viewerSide,
  onCandidatureUpdated,
  onEditRequest,
}: {
  candidature: CandidatureDetail;
  onClose: () => void;
  viewerSide: 'brand' | 'showroom';
  /** Appelé après une action (accepter, refuser, annuler) pour que le parent rafraîchisse sa liste */
  onCandidatureUpdated?: (updated: CandidatureDetail) => void;
  /** Ouverture du formulaire de modification d'offre (marque, statut pending) ; reçoit la candidature à jour */
  onEditRequest?: (c: CandidatureDetail) => void;
}) {
  const { userId } = useAdminEntity();
  const [brandRow, setBrandRow] = useState<BrandRow | null>(null);
  const [showroomRow, setShowroomRow] = useState<ShowroomRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshedCandidature, setRefreshedCandidature] = useState<CandidatureDetail | null>(null);
  const [messageBody, setMessageBody] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [messageListKey, setMessageListKey] = useState(0);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const fetchCandidature = useCallback(async () => {
    const [candRes, brandRes, showroomRes] = await Promise.all([
      supabase.from('candidatures').select('*').eq('id', candidature.id).single(),
      supabase.from('brands').select('id, brand_name, owner_id, avatar_url').eq('id', candidature.brand_id).single(),
      supabase.from('showrooms').select('id, name, owner_id, avatar_url').eq('id', candidature.showroom_id).single(),
    ]);
    const raw = candRes.data as (Candidature & { showroom?: { name?: string }; brand?: { brand_name?: string }; option?: ShowroomCommissionOption }) | null;
    if (raw) {
      let option: ShowroomCommissionOption | undefined;
      if (raw.showroom_commission_option_id != null) {
        const { data: optRow } = await supabase.from('showroom_commission_options').select('*').eq('id', raw.showroom_commission_option_id).single();
        option = optRow as ShowroomCommissionOption | undefined;
      }
      setRefreshedCandidature({
        ...raw,
        showroom: candidature.showroom ?? raw.showroom,
        brand: candidature.brand ?? raw.brand,
        option: option ?? candidature.option,
      });
    } else {
      setRefreshedCandidature({ ...candidature });
    }
    const b = brandRes.data as BrandRow | null;
    const s = showroomRes.data as ShowroomRow | null;
    setBrandRow(b ?? null);
    setShowroomRow(s ?? null);
  }, [candidature.id, candidature.brand_id, candidature.showroom_id, candidature.showroom, candidature.brand, candidature.option]);

  useEffect(() => {
    getOrCreateConversationId(candidature.brand_id, candidature.showroom_id).then((id) => {
      setConversationId(id ?? null);
    });
  }, [candidature.brand_id, candidature.showroom_id]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      await fetchCandidature();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fetchCandidature]);

  const c = refreshedCandidature ?? candidature;
  const status = c.status ?? 'pending';

  async function releaseReservedCredit(brandId: number) {
    const { data: row } = await supabase.from('brands').select('reserved_credits').eq('id', brandId).single();
    const r = typeof (row as { reserved_credits?: number })?.reserved_credits === 'number' ? (row as { reserved_credits: number }).reserved_credits : 0;
    await supabase.from('brands').update({ reserved_credits: Math.max(0, r - 1) }).eq('id', brandId);
  }

  const handleAccept = async () => {
    if (viewerSide !== 'showroom' || status !== 'pending') return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('candidatures').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('id', c.id);
      if (!error) {
        const { data: row } = await supabase.from('brands').select('credits, reserved_credits').eq('id', c.brand_id).single();
        const cr = typeof (row as { credits?: number })?.credits === 'number' ? (row as { credits: number }).credits : 0;
        const res = typeof (row as { reserved_credits?: number })?.reserved_credits === 'number' ? (row as { reserved_credits: number }).reserved_credits : 0;
        await supabase.from('brands').update({ credits: Math.max(0, cr - 1), reserved_credits: Math.max(0, res - 1) }).eq('id', c.brand_id);
        await fetchCandidature();
        onCandidatureUpdated?.({ ...c, status: 'accepted' });
        setMessageListKey((k) => k + 1);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (viewerSide !== 'showroom' || status !== 'pending') return;
    if (!confirm('Refuser cette offre ?')) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('candidatures').update({ status: 'rejected', updated_at: new Date().toISOString() }).eq('id', c.id);
      if (!error) {
        await releaseReservedCredit(c.brand_id);
        await fetchCandidature();
        onCandidatureUpdated?.({ ...c, status: 'rejected' });
        setMessageListKey((k) => k + 1);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (viewerSide !== 'brand' || status !== 'pending') return;
    if (!confirm('Annuler la demande ?')) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('candidatures').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', c.id);
      if (!error) {
        await releaseReservedCredit(c.brand_id);
        await fetchCandidature();
        onCandidatureUpdated?.({ ...c, status: 'cancelled' });
        setMessageListKey((k) => k + 1);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !messageBody.trim() || sendingMessage || status !== 'pending' || !conversationId) return;
    const trimmed = messageBody.trim();
    setSendingMessage(true);
    try {
      const senderRole = viewerSide === 'brand' ? 'brand' : 'boutique';
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        type: 'CHAT',
        sender_id: userId,
        sender_role: senderRole,
        content: trimmed,
        is_read: false,
      });
      if (!error) {
        setMessageBody('');
        setMessageListKey((k) => k + 1);
      }
    } finally {
      setSendingMessage(false);
    }
  };

  const title = viewerSide === 'brand' ? c.showroom?.name ?? 'Boutique' : c.brand?.brand_name ?? 'Marque';
  const titleLogo = viewerSide === 'brand' ? showroomRow : brandRow;
  const titleLogoUrl = titleLogo && 'avatar_url' in titleLogo ? titleLogo.avatar_url : null;

  const hasOption = c.showroom_commission_option_id != null && c.option;
  const hasNegotiation = Boolean(c.negotiation_message?.trim());
  const offerSummary =
    hasOption ? formatOptionLabel(c.option!) : hasNegotiation ? `Négociation : ${c.negotiation_message!.trim()}` : null;

  const isPending = status === 'pending';
  const isAccepted = status === 'accepted';

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" aria-hidden onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden pointer-events-auto flex flex-col" role="dialog" aria-modal="true" aria-labelledby="candidature-detail-title">
          <div className="p-4 border-b border-neutral-200 flex items-center gap-3 justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {titleLogoUrl?.trim() ? (
                <img src={titleLogoUrl.trim()} alt="" className="w-10 h-10 rounded-full object-cover border border-neutral-200 shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                  {viewerSide === 'brand' ? <Store className="h-5 w-5 text-neutral-400" /> : <Sparkles className="h-5 w-5 text-neutral-400" />}
                </div>
              )}
              <h2 id="candidature-detail-title" className="text-lg font-semibold text-neutral-900 truncate">Détail de la demande · {title}</h2>
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100" aria-label="Fermer">
              <X className="h-5 w-5" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 flex-1">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
            </div>
          ) : (
            <>
              {/* Résumé offre + actions bilatérales */}
              <div className="p-4 border-b border-neutral-100 bg-neutral-50/50 shrink-0 space-y-3">
                {(offerSummary != null || c.partnership_start_at != null || c.partnership_end_at != null || c.validity_days != null || (c.message != null && c.message.trim() !== '')) && (
                  <div className="p-3 rounded-lg border border-neutral-200 bg-white space-y-1">
                    <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Offre actuelle</p>
                    {offerSummary != null && <p className="text-sm text-neutral-900">{offerSummary}</p>}
                    {c.partnership_start_at != null && c.partnership_end_at != null && (
                      <p className="text-sm text-neutral-700">
                        Partenariat du {new Date(c.partnership_start_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} au {new Date(c.partnership_end_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                    {c.validity_days != null && !c.partnership_start_at && !c.partnership_end_at && <p className="text-sm text-neutral-700">Valable {c.validity_days} jours</p>}
                    {c.message != null && c.message.trim() !== '' && <p className="text-sm text-neutral-600 mt-1">{c.message.trim()}</p>}
                  </div>
                )}

                {/* Actions selon viewerSide et status */}
                {viewerSide === 'brand' && (
                  <>
                    {isPending && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onEditRequest?.(c)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 text-neutral-700 text-sm font-medium hover:bg-neutral-50"
                        >
                          <Pencil className="h-4 w-4" /> Modifier l&apos;offre
                        </button>
                        <button
                          type="button"
                          onClick={handleCancel}
                          disabled={actionLoading}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-700 text-sm font-medium hover:bg-red-50 disabled:opacity-60"
                        >
                          {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Annuler la demande
                        </button>
                      </div>
                    )}
                    {isAccepted && (
                      <p className="inline-flex items-center gap-2 text-sm text-neutral-600 py-1">
                        <Handshake className="h-4 w-4 text-emerald-600" /> Partenariat actif
                      </p>
                    )}
                    {(status === 'rejected' || status === 'cancelled') && (
                      <p className="text-sm text-neutral-500 py-1">
                        {status === 'rejected' ? 'Offre refusée' : 'Demande annulée'}
                      </p>
                    )}
                  </>
                )}
                {viewerSide === 'showroom' && (
                  <>
                    {isPending && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleAccept}
                          disabled={actionLoading}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-60"
                        >
                          {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} Accepter l&apos;offre
                        </button>
                        <button
                          type="button"
                          onClick={handleDecline}
                          disabled={actionLoading}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-200 text-neutral-700 text-sm font-medium hover:bg-neutral-50 disabled:opacity-60"
                        >
                          <XCircle className="h-4 w-4" /> Refuser
                        </button>
                      </div>
                    )}
                    {isAccepted && (
                      <p className="inline-flex items-center gap-2 text-sm text-neutral-600 py-1">
                        <Handshake className="h-4 w-4 text-emerald-600" /> Partenariat actif
                      </p>
                    )}
                    {status === 'rejected' && (
                      <p className="text-sm text-neutral-500 py-1">Offre refusée</p>
                    )}
                    {status === 'cancelled' && (
                      <p className="text-sm text-neutral-500 py-1">Demande annulée</p>
                    )}
                  </>
                )}
              </div>

              {/* Fil de messages unifié (même source que /messages) */}
              <div className="flex-1 overflow-y-auto min-h-0 p-4">
                <MessageList
                  brandId={c.brand_id}
                  showroomId={c.showroom_id}
                  viewerSide={viewerSide}
                  brandLabel={c.brand?.brand_name ?? 'Marque'}
                  showroomLabel={c.showroom?.name ?? 'Boutique'}
                  currentUserId={userId}
                />
              </div>

              {/* Saisie message (si pending et utilisateur connecté) */}
              {isPending && userId && (
                <form onSubmit={handleSendMessage} className="p-4 border-t border-neutral-200 bg-white shrink-0 flex gap-2">
                  <input
                    type="text"
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    placeholder="Écrire un message…"
                    className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-neutral-200 text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                  <button
                    type="submit"
                    disabled={sendingMessage || !messageBody.trim()}
                    className="px-3 py-2 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  >
                    {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Envoyer
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
