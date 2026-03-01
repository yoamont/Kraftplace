'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { MessageSquare, Loader2, X, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdminEntity } from '@/app/admin/context/AdminEntityContext';
import { useChat } from '@/lib/hooks/useChat';
import { ChatInput } from './ChatInput';
import { MessageEntry } from './MessageEntry';
import { CreditsRechargeModal } from '@/app/admin/components/CreditsRechargeModal';

type Props = {
  conversationId: string | null;
  currentUserId: string | null;
  entityType: 'brand' | 'showroom' | null;
  otherUserName: string;
  otherUserAvatarUrl: string | null;
  myLabel?: string;
  brandId?: number;
  showroomId?: number;
};

export function ChatView({
  conversationId,
  currentUserId,
  entityType,
  otherUserName,
  otherUserAvatarUrl,
  myLabel = 'Vous',
  brandId,
  showroomId,
}: Props) {
  const { activeBrand, activeShowroom, refresh: refreshEntity } = useAdminEntity();
  const senderRole: 'brand' | 'boutique' | undefined = entityType === 'brand' ? 'brand' : entityType === 'showroom' ? 'boutique' : undefined;
  const { messages, loading, sending, sendMessage, sendEvent, updateMessageMetadata, error, refresh } = useChat(conversationId, currentUserId, senderRole);
  const brandDisplayName = entityType === 'brand' ? myLabel : otherUserName;
  const showroomDisplayName = entityType === 'brand' ? otherUserName : myLabel;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [negotiateMessageId, setNegotiateMessageId] = useState<string | null>(null);
  const [negotiateRent, setNegotiateRent] = useState<string>('');
  const [negotiateCommission, setNegotiateCommission] = useState<string>('');
  const [negotiateMessage, setNegotiateMessage] = useState('');
  const [negotiateSubmitting, setNegotiateSubmitting] = useState(false);

  const [cancelCandidatureSubmitting, setCancelCandidatureSubmitting] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!loading) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [loading]);

  const handleAcceptDeal = async (messageId: string) => {
    await updateMessageMetadata(messageId, { status: 'accepted', accepted_at: new Date().toISOString() });
  };

  const handleDeclineDeal = async (messageId: string) => {
    await updateMessageMetadata(messageId, { status: 'rejected', declined_at: new Date().toISOString() });
  };

  const handleSignContract = async (messageId: string) => {
    await updateMessageMetadata(messageId, { status: 'signed', signed_at: new Date().toISOString() });
  };

  const handleAcceptCandidature = async (messageId: string) => {
    if (!conversationId) return;
    const { data: conv } = await supabase.from('conversations').select('brand_id').eq('id', conversationId).single();
    const bid = (conv as { brand_id?: number } | null)?.brand_id;
    if (typeof bid === 'number') {
      const { data: row } = await supabase.from('brands').select('credits, reserved_credits').eq('id', bid).single();
      const c = typeof (row as { credits?: number })?.credits === 'number' ? (row as { credits: number }).credits : 0;
      const r = typeof (row as { reserved_credits?: number })?.reserved_credits === 'number' ? (row as { reserved_credits: number }).reserved_credits : 0;
      await supabase.from('brands').update({ credits: Math.max(0, c - 1), reserved_credits: Math.max(0, r - 1) }).eq('id', bid);
    }
    await updateMessageMetadata(messageId, { status: 'accepted', accepted_at: new Date().toISOString() });
    await sendEvent('CANDIDATURE_ACCEPTED', { reference_message_id: messageId });
    refresh();
  };

  const handleDeclineCandidature = async (messageId: string) => {
    if (conversationId) {
      const { data: conv } = await supabase.from('conversations').select('brand_id').eq('id', conversationId).single();
      const bid = (conv as { brand_id?: number } | null)?.brand_id;
      if (typeof bid === 'number') {
        const { data: row } = await supabase.from('brands').select('reserved_credits').eq('id', bid).single();
        const r = typeof (row as { reserved_credits?: number })?.reserved_credits === 'number' ? (row as { reserved_credits: number }).reserved_credits : 0;
        await supabase.from('brands').update({ reserved_credits: Math.max(0, r - 1) }).eq('id', bid);
      }
    }
    await updateMessageMetadata(messageId, { status: 'rejected', declined_at: new Date().toISOString() });
    await sendEvent('CANDIDATURE_REFUSED', { reference_message_id: messageId });
    refresh();
  };

  const handleCancelMyCandidature = async () => {
    if (!pendingCandidatureMessageId || !activeBrand) return;
    if (!window.confirm('Annuler votre candidature ? Votre crédit réservé sera libéré.')) return;
    setCancelCandidatureSubmitting(true);
    try {
      await updateMessageMetadata(pendingCandidatureMessageId, { status: 'cancelled', cancelled_at: new Date().toISOString() });
      const reserved = typeof (activeBrand as { reserved_credits?: number }).reserved_credits === 'number' ? (activeBrand as { reserved_credits: number }).reserved_credits : 0;
      await supabase.from('brands').update({ reserved_credits: Math.max(0, reserved - 1) }).eq('id', activeBrand.id);
      await refresh();
      refreshEntity();
    } finally {
      setCancelCandidatureSubmitting(false);
    }
  };

  const handleOpenNegotiate = (messageId: string) => {
    setNegotiateMessageId(messageId);
    setNegotiateRent('');
    setNegotiateCommission('');
    setNegotiateMessage('');
  };

  const handleSubmitNegotiate = async () => {
    if (!negotiateMessageId) return;
    const rent = negotiateRent.trim() ? Number(negotiateRent) : undefined;
    const commission = negotiateCommission.trim() ? Number(negotiateCommission) : undefined;
    if (rent == null && commission == null && !negotiateMessage.trim()) return;
    setNegotiateSubmitting(true);
    try {
      await sendEvent('OFFER_NEGOTIATED', {
        reference_message_id: negotiateMessageId,
        ...(rent != null && !Number.isNaN(rent) && { rent }),
        ...(commission != null && !Number.isNaN(commission) && { commission_percent: commission }),
        rent_period: 'month',
        validity_days: 7,
        status: 'pending',
        ...(negotiateMessage.trim() && { negotiation_message: negotiateMessage.trim() }),
      });
      setNegotiateMessageId(null);
      refresh();
    } finally {
      setNegotiateSubmitting(false);
    }
  };

  const { hasPendingCandidature, pendingCandidatureMessageId } = useMemo(() => {
    if (!messages.length) return { hasPendingCandidature: false, pendingCandidatureMessageId: null as string | null };
    const sentIdx = messages.findIndex((m) => m.type === 'CANDIDATURE_SENT');
    if (sentIdx === -1) return { hasPendingCandidature: false, pendingCandidatureMessageId: null };
    const acceptedAfter = messages.slice(sentIdx + 1).some((m) => m.type === 'CANDIDATURE_ACCEPTED');
    if (acceptedAfter) return { hasPendingCandidature: false, pendingCandidatureMessageId: null };
    const msg = messages[sentIdx];
    const meta = msg.metadata as { status?: string } | undefined;
    const pending = meta?.status === 'pending' || meta?.status == null;
    return { hasPendingCandidature: pending, pendingCandidatureMessageId: pending && entityType === 'brand' ? msg.id : null };
  }, [entityType, messages]);

  const chatLocked = loading || hasPendingCandidature;
  const prevPendingRef = useRef(hasPendingCandidature);
  const [showUnlockBanner, setShowUnlockBanner] = useState(false);

  useEffect(() => {
    const wasPending = prevPendingRef.current;
    prevPendingRef.current = hasPendingCandidature;
    if (entityType === 'brand' && wasPending && !hasPendingCandidature && !loading && messages.some((m) => m.type === 'CANDIDATURE_ACCEPTED')) {
      setShowUnlockBanner(true);
      const t = setTimeout(() => setShowUnlockBanner(false), 6000);
      return () => clearTimeout(t);
    }
  }, [hasPendingCandidature, loading, entityType, messages]);

  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-neutral-50/50 text-neutral-500 p-8">
        <MessageSquare className="h-16 w-16 text-neutral-300 mb-4" />
        <p className="text-sm font-medium">Sélectionnez une conversation pour commencer</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen max-h-screen bg-white overflow-hidden relative">
      <div className="h-16 shrink-0 border-b flex items-center px-6 bg-white">
        {otherUserAvatarUrl?.trim() ? (
          <img
            src={otherUserAvatarUrl.trim()}
            alt=""
            className="w-10 h-10 rounded-full object-cover border border-neutral-200 shrink-0"
          />
        ) : (
          <span className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center shrink-0">
            <MessageSquare className="h-5 w-5 text-neutral-500" />
          </span>
        )}
        <p className="ml-3 font-semibold text-neutral-900 truncate">{otherUserName}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800 flex items-center justify-between gap-2">
            <span>{error}</span>
            <button type="button" onClick={() => refresh()} className="px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-700 font-medium">
              Rafraîchir
            </button>
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-neutral-500 text-sm gap-3">
            <p>Aucun message. Envoyez le premier.</p>
            <button type="button" onClick={() => refresh()} className="text-sm font-medium text-neutral-700 hover:text-neutral-900 underline">
              Rafraîchir l&apos;historique
            </button>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.sender_id != null && currentUserId != null && m.sender_id === currentUserId;
            return (
              <MessageEntry
                key={m.id}
                message={m}
                isMe={isMe}
                myLabel={myLabel}
                otherUserName={otherUserName}
                brandDisplayName={brandDisplayName}
                showroomDisplayName={showroomDisplayName}
                viewerRole={senderRole}
                onAcceptDeal={handleAcceptDeal}
                onDeclineDeal={handleDeclineDeal}
                onSignContract={handleSignContract}
                onAcceptCandidature={handleAcceptCandidature}
                onDeclineCandidature={handleDeclineCandidature}
                onNegotiateCandidature={handleOpenNegotiate}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 border-t bg-neutral-50">
        <div className="p-4 pt-0 w-full">
          {showUnlockBanner && entityType === 'brand' && (
            <div className="mb-3 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-900 shadow-sm">
              <p className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                Chat débloqué !
              </p>
              <p className="mt-1 text-green-800">
                Vous pouvez échanger avec la boutique. Votre crédit a bien été débité.
              </p>
            </div>
          )}
          {chatLocked ? (
            loading ? (
              <div className="rounded-lg bg-neutral-100 border border-neutral-200 px-4 py-3 text-sm text-neutral-500">
                Chargement de la conversation…
              </div>
            ) : entityType === 'brand' ? (
              <>
                <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-900 mb-3">
                  <p className="font-medium">Candidature envoyée.</p>
                  <p className="mt-1 text-blue-800">
                    Le chat s&apos;ouvrira dès que la boutique aura validé votre profil. Aucun crédit n&apos;est débité pour le moment.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancelMyCandidature}
                    disabled={cancelCandidatureSubmitting}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-neutral-300 bg-neutral-100 text-neutral-600 text-sm font-medium hover:bg-neutral-200 disabled:opacity-60"
                  >
                    {cancelCandidatureSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Annuler ma candidature
                  </button>
                </div>
              </>
            ) : (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
                <p className="font-medium">Une candidature est en attente de votre réponse.</p>
                <p className="mt-1 text-amber-800">
                  Acceptez ou refusez la candidature dans le fil de discussion ci-dessus pour débloquer le chat et échanger avec la marque.
                </p>
              </div>
            )
          ) : (
            <ChatInput
              onSend={sendMessage}
              disabled={sending || !currentUserId}
              placeholder="Écrire un message…"
            />
          )}
        </div>
      </div>

      {negotiateMessageId && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" aria-hidden onClick={() => setNegotiateMessageId(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 pointer-events-auto" role="dialog" aria-modal="true" aria-labelledby="negotiate-title">
              <div className="flex items-center justify-between mb-4">
                <h2 id="negotiate-title" className="text-lg font-semibold text-neutral-900">Proposer une contre-offre</h2>
                <button type="button" onClick={() => setNegotiateMessageId(null)} className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100" aria-label="Fermer">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label htmlFor="neg-rent" className="block text-sm font-medium text-neutral-700 mb-1">Loyer (€/mois)</label>
                  <input
                    id="neg-rent"
                    type="number"
                    min={0}
                    step={1}
                    value={negotiateRent}
                    onChange={(e) => setNegotiateRent(e.target.value)}
                    placeholder="ex. 300"
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
                <div>
                  <label htmlFor="neg-commission" className="block text-sm font-medium text-neutral-700 mb-1">Commission (%)</label>
                  <input
                    id="neg-commission"
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={negotiateCommission}
                    onChange={(e) => setNegotiateCommission(e.target.value)}
                    placeholder="ex. 30"
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
                <div>
                  <label htmlFor="neg-message" className="block text-sm font-medium text-neutral-700 mb-1">Message (optionnel)</label>
                  <textarea
                    id="neg-message"
                    value={negotiateMessage}
                    onChange={(e) => setNegotiateMessage(e.target.value)}
                    placeholder="Précisez votre proposition…"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2 justify-end">
                <button type="button" onClick={() => setNegotiateMessageId(null)} className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-700 font-medium hover:bg-neutral-50">
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={negotiateSubmitting || (!negotiateRent.trim() && !negotiateCommission.trim() && !negotiateMessage.trim())}
                  onClick={handleSubmitNegotiate}
                  className="px-4 py-2 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-2"
                >
                  {negotiateSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Envoyer la proposition
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {showRechargeModal && (
        <CreditsRechargeModal onClose={() => setShowRechargeModal(false)} title="Recharger mes crédits" />
      )}

    </div>
  );
}
