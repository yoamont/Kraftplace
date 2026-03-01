'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import { X, MessageSquare, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdminEntity } from '@/app/admin/context/AdminEntityContext';
import { useChat } from '@/lib/hooks/useChat';
import { MessageEntry } from '@/app/admin/messaging/MessageEntry';
import { ChatInput } from '@/app/admin/messaging/ChatInput';
import type { PlacementStatus } from '@/lib/hooks/usePlacements';

type Props = {
  open: boolean;
  onClose: () => void;
  conversationId: string | null;
  otherPartyName: string;
  otherPartyAvatarUrl: string | null;
  status: PlacementStatus;
};

export function PartnershipDetailDrawer({
  open,
  onClose,
  conversationId,
  otherPartyName,
  otherPartyAvatarUrl,
  status,
}: Props) {
  const { userId, entityType, activeBrand, activeShowroom } = useAdminEntity();
  const senderRole: 'brand' | 'boutique' | undefined = entityType === 'brand' ? 'brand' : entityType === 'showroom' ? 'boutique' : undefined;
  const { messages, loading, sending, sendMessage, sendEvent, updateMessageMetadata, refresh } = useChat(
    open ? conversationId : null,
    userId,
    senderRole
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const myLabel = activeBrand?.brand_name ?? activeShowroom?.name ?? 'Vous';
  const brandDisplayName = entityType === 'brand' ? myLabel : otherPartyName;
  const showroomDisplayName = entityType === 'brand' ? otherPartyName : myLabel;

  const [cancelCandidatureSubmitting, setCancelCandidatureSubmitting] = useState(false);
  const [negotiateMessageId, setNegotiateMessageId] = useState<string | null>(null);
  const [negotiateRent, setNegotiateRent] = useState('');
  const [negotiateCommission, setNegotiateCommission] = useState('');
  const [negotiateMessage, setNegotiateMessage] = useState('');
  const [negotiateSubmitting, setNegotiateSubmitting] = useState(false);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

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

  const chatLocked = status === 'pending' || hasPendingCandidature;

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[2px]" aria-hidden onClick={onClose} />
      <div
        className="fixed top-0 right-0 bottom-0 w-full max-w-lg bg-[#FBFBFD] z-50 flex flex-col border-l border-black/[0.06]"
        style={{ boxShadow: '-4px 0 20px rgba(0,0,0,0.06)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="partnership-drawer-title"
      >
        <div className="shrink-0 flex items-center justify-between h-14 px-4 border-b border-black/[0.06] bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            {otherPartyAvatarUrl?.trim() ? (
              <img src={otherPartyAvatarUrl.trim()} alt="" className="w-9 h-9 rounded-full object-cover shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.04)]" />
            ) : (
              <span className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                <MessageSquare className="h-4 w-4 text-neutral-400" strokeWidth={1.5} />
              </span>
            )}
            <h2 id="partnership-drawer-title" className="font-medium text-neutral-900 truncate">
              {otherPartyName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-400" strokeWidth={1.5} />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-sm font-light text-neutral-500 text-center py-8">Aucun message.</p>
          ) : (
            messages.map((m) => {
              const isMe = m.sender_id != null && userId != null && m.sender_id === userId;
              return (
                <MessageEntry
                  key={m.id}
                  message={m}
                  isMe={isMe}
                  myLabel={myLabel}
                  otherUserName={otherPartyName}
                  brandDisplayName={brandDisplayName}
                  showroomDisplayName={showroomDisplayName}
                  viewerRole={senderRole}
                  onAcceptCandidature={handleAcceptCandidature}
                  onDeclineCandidature={handleDeclineCandidature}
                  onNegotiateCandidature={handleOpenNegotiate}
                />
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="shrink-0 border-t border-black/[0.06] bg-white/95 p-4">
          {chatLocked ? (
            <div className="rounded-xl bg-neutral-100/90 px-4 py-3 text-center">
              <p className="text-sm font-light text-neutral-600">Le chat s&apos;ouvrira après validation.</p>
              {entityType === 'brand' && pendingCandidatureMessageId && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!activeBrand) return;
                    if (!window.confirm('Annuler votre candidature ?')) return;
                    setCancelCandidatureSubmitting(true);
                    try {
                      await updateMessageMetadata(pendingCandidatureMessageId, { status: 'cancelled', cancelled_at: new Date().toISOString() });
                      const reserved = typeof (activeBrand as { reserved_credits?: number }).reserved_credits === 'number' ? (activeBrand as { reserved_credits: number }).reserved_credits : 0;
                      await supabase.from('brands').update({ reserved_credits: Math.max(0, reserved - 1) }).eq('id', activeBrand.id);
                      await refresh();
                    } finally {
                      setCancelCandidatureSubmitting(false);
                    }
                  }}
                  disabled={cancelCandidatureSubmitting}
                  className="mt-2 text-xs font-medium text-neutral-500 hover:text-neutral-700 underline disabled:opacity-50"
                >
                  {cancelCandidatureSubmitting ? 'Annulation…' : 'Annuler ma candidature'}
                </button>
              )}
            </div>
          ) : (
            <ChatInput onSend={sendMessage} disabled={sending || !userId} placeholder="Écrire un message…" />
          )}
        </div>
      </div>

      {negotiateMessageId && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[60]" aria-hidden onClick={() => setNegotiateMessageId(null)} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.12)] max-w-md w-full p-4 pointer-events-auto border border-black/[0.06]" role="dialog" aria-modal="true" aria-labelledby="drawer-negociate-title">
              <div className="flex items-center justify-between mb-4">
                <h2 id="drawer-negociate-title" className="text-lg font-semibold text-neutral-900">Proposer une contre-offre</h2>
                <button type="button" onClick={() => setNegotiateMessageId(null)} className="p-2 rounded-xl text-neutral-500 hover:bg-neutral-100" aria-label="Fermer">
                  <X className="h-5 w-5" strokeWidth={1.5} />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label htmlFor="drawer-neg-rent" className="block text-sm font-medium text-neutral-700 mb-1">Loyer (€/mois)</label>
                  <input
                    id="drawer-neg-rent"
                    type="number"
                    min={0}
                    step={1}
                    value={negotiateRent}
                    onChange={(e) => setNegotiateRent(e.target.value)}
                    placeholder="ex. 300"
                    className="w-full px-3 py-2 rounded-xl border border-black/[0.08] text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                  />
                </div>
                <div>
                  <label htmlFor="drawer-neg-commission" className="block text-sm font-medium text-neutral-700 mb-1">Commission (%)</label>
                  <input
                    id="drawer-neg-commission"
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={negotiateCommission}
                    onChange={(e) => setNegotiateCommission(e.target.value)}
                    placeholder="ex. 30"
                    className="w-full px-3 py-2 rounded-xl border border-black/[0.08] text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                  />
                </div>
                <div>
                  <label htmlFor="drawer-neg-message" className="block text-sm font-medium text-neutral-700 mb-1">Message (optionnel)</label>
                  <textarea
                    id="drawer-neg-message"
                    value={negotiateMessage}
                    onChange={(e) => setNegotiateMessage(e.target.value)}
                    placeholder="Précisez votre proposition…"
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl border border-black/[0.08] text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/20 resize-none"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2 justify-end">
                <button type="button" onClick={() => setNegotiateMessageId(null)} className="px-4 py-2 rounded-xl border border-black/[0.08] text-neutral-700 font-medium hover:bg-neutral-50">
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={negotiateSubmitting || (!negotiateRent.trim() && !negotiateCommission.trim() && !negotiateMessage.trim())}
                  onClick={handleSubmitNegotiate}
                  className="px-4 py-2 rounded-xl bg-neutral-900 text-white font-medium hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-2"
                >
                  {negotiateSubmitting ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : null}
                  Envoyer la proposition
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
