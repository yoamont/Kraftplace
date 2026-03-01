'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { MessageSquare, Loader2, X, Send, CreditCard, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdminEntity } from '@/app/admin/context/AdminEntityContext';
import { useChat } from '@/lib/hooks/useChat';
import { ChatInput } from './ChatInput';
import { MessageEntry } from './MessageEntry';
import { CreditsRechargeModal } from '@/app/admin/components/CreditsRechargeModal';
import type { ShowroomCommissionOption } from '@/lib/supabase';

const PLATFORM_FEE_PERCENT = 2;

function rentPeriodLabel(period: string | null): string {
  if (period === 'week') return '/sem.'; if (period === 'one_off') return ' unique'; return '/mois';
}
function optionSummary(opt: ShowroomCommissionOption): string {
  const parts: string[] = [];
  if (opt.rent != null && opt.rent > 0) parts.push(`${opt.rent}€${rentPeriodLabel(opt.rent_period)}`);
  if (opt.commission_percent != null) parts.push(`${opt.commission_percent} % sur ventes`);
  if (opt.description?.trim()) parts.push(opt.description);
  return parts.join(' · ') || 'Option';
}

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

  // Modal candidature (depuis la messagerie)
  const [showCandidatureModal, setShowCandidatureModal] = useState(false);
  const [candOptions, setCandOptions] = useState<ShowroomCommissionOption[]>([]);
  const [candSelectedOptionId, setCandSelectedOptionId] = useState<number | null>(null);
  const [candIsNegotiation, setCandIsNegotiation] = useState(false);
  const [candNegotiationMessage, setCandNegotiationMessage] = useState('');
  const [candMotivationMessage, setCandMotivationMessage] = useState('');
  const [candSubmitting, setCandSubmitting] = useState(false);

  // Modal demande de paiement
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentRequestAsPayer, setPaymentRequestAsPayer] = useState<boolean | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMotif, setPaymentMotif] = useState('');
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Modal Refuser demande de paiement (motif)
  const [paymentDeclineMessageId, setPaymentDeclineMessageId] = useState<string | null>(null);
  const [paymentDeclineRequestId, setPaymentDeclineRequestId] = useState<string | null>(null);
  const [paymentDeclineNote, setPaymentDeclineNote] = useState('');
  const [paymentDeclineSubmitting, setPaymentDeclineSubmitting] = useState(false);

  // Modal Négocier demande de paiement (montant proposé + message)
  const [paymentNegotiateMessageId, setPaymentNegotiateMessageId] = useState<string | null>(null);
  const [paymentNegotiateRequestId, setPaymentNegotiateRequestId] = useState<string | null>(null);
  const [paymentNegotiateAmount, setPaymentNegotiateAmount] = useState('');
  const [paymentNegotiateMessage, setPaymentNegotiateMessage] = useState('');
  const [paymentNegotiateSubmitting, setPaymentNegotiateSubmitting] = useState(false);

  const [cancelCandidatureSubmitting, setCancelCandidatureSubmitting] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!loading) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [loading]);

  // Charger les options de la boutique quand on ouvre le modal candidature
  useEffect(() => {
    if (!showCandidatureModal || !showroomId) return;
    (async () => {
      const { data } = await supabase
        .from('showroom_commission_options')
        .select('*')
        .eq('showroom_id', showroomId)
        .order('sort_order');
      setCandOptions((data as ShowroomCommissionOption[]) ?? []);
      setCandSelectedOptionId(null);
      setCandIsNegotiation(false);
      setCandNegotiationMessage('');
      setCandMotivationMessage('');
    })();
  }, [showCandidatureModal, showroomId]);

  const canSubmitCandidature =
    (candSelectedOptionId != null && !candIsNegotiation) || (candIsNegotiation && candNegotiationMessage.trim().length > 0);

  const handleSubmitCandidatureFromChat = async () => {
    if (!conversationId || !currentUserId || !activeBrand || entityType !== 'brand') return;
    if (!canSubmitCandidature) return;
    setCandSubmitting(true);
    try {
      const metadata: Record<string, unknown> = {
        status: 'pending',
      };
      if (candSelectedOptionId != null && !candIsNegotiation && candOptions.length) {
        const opt = candOptions.find((o) => o.id === candSelectedOptionId);
        if (opt) {
          metadata.rent = opt.rent ?? undefined;
          metadata.rent_period = opt.rent_period ?? 'month';
          metadata.commission_percent = opt.commission_percent ?? undefined;
          if (opt.description?.trim()) metadata.option_description = opt.description;
        }
      } else if (candIsNegotiation) {
        metadata.negotiation_message = candNegotiationMessage.trim();
      }
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        type: 'CANDIDATURE_SENT',
        sender_id: currentUserId,
        sender_role: 'brand',
        content: candMotivationMessage.trim() || null,
        metadata,
        is_read: false,
      });
      const reserved = typeof (activeBrand as { reserved_credits?: number }).reserved_credits === 'number' ? (activeBrand as { reserved_credits: number }).reserved_credits : 0;
      await supabase.from('brands').update({ reserved_credits: reserved + 1 }).eq('id', activeBrand.id);
      refreshEntity();
      if (candMotivationMessage.trim()) {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          type: 'CHAT',
          sender_id: currentUserId,
          sender_role: 'brand',
          content: candMotivationMessage.trim(),
          is_read: false,
        });
      }
      setShowCandidatureModal(false);
      refresh();
    } finally {
      setCandSubmitting(false);
    }
  };

  const handleOpenCandidatureModal = () => {
    if (!activeBrand || entityType !== 'brand') return;
    const credits = typeof activeBrand.credits === 'number' ? activeBrand.credits : 0;
    const reserved = typeof (activeBrand as { reserved_credits?: number }).reserved_credits === 'number' ? (activeBrand as { reserved_credits: number }).reserved_credits : 0;
    const available = credits - reserved;
    if (available < 1) {
      setShowRechargeModal(true);
      return;
    }
    const confirmed = typeof window !== 'undefined' && window.confirm(`Cette action réservera 1 crédit. Il vous en reste ${available} disponible(s). Continuer ?`);
    if (confirmed) setShowCandidatureModal(true);
  };

  const handleSubmitPaymentFromChat = async () => {
    if (!conversationId || !brandId || !showroomId || paymentRequestAsPayer === null || !paymentAmount.trim()) return;
    const amountCents = Math.round(parseFloat(paymentAmount.replace(',', '.')) * 100);
    if (Number.isNaN(amountCents) || amountCents <= 0) {
      setPaymentError('Montant invalide.');
      return;
    }
    const platformFeeCents = Math.ceil(amountCents * (PLATFORM_FEE_PERCENT / 100));
    const asBrand = entityType === 'brand';
    const type: 'sales' | 'rent' = asBrand ? (paymentRequestAsPayer ? 'rent' : 'sales') : (paymentRequestAsPayer ? 'sales' : 'rent');
    const initiator_side = asBrand ? 'brand' : 'showroom';
    const counterpart_brand_id = asBrand ? null : brandId;
    const counterpart_showroom_id = asBrand ? showroomId : null;
    setPaymentError(null);
    setPaymentSubmitting(true);
    try {
      let attachmentPath: string | null = null;
      if (paymentFile) {
        const ext = paymentFile.name.split('.').pop() || 'pdf';
        const folder = asBrand && activeBrand ? `brands/${activeBrand.id}` : activeShowroom ? `showrooms/${activeShowroom.id}` : 'payments';
        const path = `${folder}/conv-${conversationId}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('payment-attachments').upload(path, paymentFile, { upsert: true });
        if (upErr) {
          setPaymentError('Échec upload pièce jointe : ' + upErr.message);
          setPaymentSubmitting(false);
          return;
        }
        attachmentPath = path;
      }
      const { data: inserted, error: payErr } = await supabase
        .from('payment_requests')
        .insert({
          type,
          placement_id: null,
          candidature_id: null,
          counterpart_brand_id,
          counterpart_showroom_id,
          amount_cents: amountCents,
          platform_fee_cents: platformFeeCents,
          currency: 'eur',
          status: 'pending',
          initiator_side,
          motif: paymentMotif.trim() || null,
          sales_report_attachment_url: attachmentPath,
        })
        .select('id')
        .single();
      if (payErr || !inserted) {
        setPaymentError(payErr?.message ?? 'Erreur création demande.');
        setPaymentSubmitting(false);
        return;
      }
      const paymentRequestId = (inserted as { id: string }).id;
      await sendEvent('PAYMENT_REQUEST', {
        payment_request_id: paymentRequestId,
        amount_cents: amountCents,
        status: 'pending',
        ...(paymentMotif.trim() && { motif: paymentMotif.trim() }),
      });
      setShowPaymentModal(false);
      setPaymentRequestAsPayer(null);
      setPaymentAmount('');
      setPaymentMotif('');
      setPaymentFile(null);
      refresh();
    } finally {
      setPaymentSubmitting(false);
    }
  };

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

  const handleAcceptPayment = async (messageId: string, paymentRequestId: string) => {
    const { error } = await supabase.from('payment_requests').update({ status: 'accepted', contest_note: null }).eq('id', paymentRequestId);
    if (!error) await updateMessageMetadata(messageId, { status: 'accepted' });
    refresh();
  };

  const handleOpenDeclinePayment = (messageId: string, paymentRequestId: string) => {
    setPaymentDeclineMessageId(messageId);
    setPaymentDeclineRequestId(paymentRequestId);
    setPaymentDeclineNote('');
  };

  const handleSubmitDeclinePayment = async () => {
    if (!paymentDeclineMessageId || !paymentDeclineRequestId) return;
    setPaymentDeclineSubmitting(true);
    try {
      const { error } = await supabase.from('payment_requests').update({ status: 'contested', contest_note: paymentDeclineNote.trim() || null }).eq('id', paymentDeclineRequestId);
      if (!error) await updateMessageMetadata(paymentDeclineMessageId, { status: 'contested', contest_note: paymentDeclineNote.trim() || null });
      setPaymentDeclineMessageId(null);
      setPaymentDeclineRequestId(null);
      setPaymentDeclineNote('');
      refresh();
    } finally {
      setPaymentDeclineSubmitting(false);
    }
  };

  const handleOpenNegotiatePayment = (messageId: string, paymentRequestId: string) => {
    setPaymentNegotiateMessageId(messageId);
    setPaymentNegotiateRequestId(paymentRequestId);
    setPaymentNegotiateAmount('');
    setPaymentNegotiateMessage('');
  };

  const handleSubmitNegotiatePayment = async () => {
    if (!paymentNegotiateMessageId || !paymentNegotiateRequestId) return;
    const amountStr = paymentNegotiateAmount.trim();
    const note = amountStr ? `Proposition : ${amountStr} €. ${paymentNegotiateMessage.trim() || ''}`.trim() : paymentNegotiateMessage.trim() || null;
    setPaymentNegotiateSubmitting(true);
    try {
      const { error } = await supabase.from('payment_requests').update({ status: 'contested', contest_note: note }).eq('id', paymentNegotiateRequestId);
      if (!error) await updateMessageMetadata(paymentNegotiateMessageId, { status: 'contested', contest_note: note });
      setPaymentNegotiateMessageId(null);
      setPaymentNegotiateRequestId(null);
      setPaymentNegotiateAmount('');
      setPaymentNegotiateMessage('');
      refresh();
    } finally {
      setPaymentNegotiateSubmitting(false);
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
                onAcceptPayment={handleAcceptPayment}
                onDeclinePayment={handleOpenDeclinePayment}
                onNegotiatePayment={handleOpenNegotiatePayment}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 border-t bg-neutral-50">
        <div className="flex flex-wrap items-center gap-2 px-4 pt-2 pb-1">
          {entityType === 'brand' && showroomId != null && !chatLocked && (
            <button
              type="button"
              onClick={handleOpenCandidatureModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-neutral-700 text-sm font-medium hover:bg-neutral-50"
            >
              <Send className="h-4 w-4" /> Envoyer une candidature
            </button>
          )}
          {brandId != null && showroomId != null && !chatLocked && (
            <button
              type="button"
              onClick={() => { setShowPaymentModal(true); setPaymentRequestAsPayer(null); setPaymentError(null); setPaymentAmount(''); setPaymentMotif(''); setPaymentFile(null); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-neutral-700 text-sm font-medium hover:bg-neutral-50"
            >
              <CreditCard className="h-4 w-4" /> Demander un paiement
            </button>
          )}
        </div>
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

      {/* Modal : Envoyer une candidature depuis la messagerie */}
      {showCandidatureModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" aria-hidden onClick={() => setShowCandidatureModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden pointer-events-auto flex flex-col" role="dialog" aria-modal="true" aria-labelledby="chat-candidature-title">
              <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
                <h2 id="chat-candidature-title" className="text-lg font-semibold text-neutral-900">Envoyer une candidature · {otherUserName}</h2>
                <button type="button" onClick={() => setShowCandidatureModal(false)} className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100" aria-label="Fermer">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 space-y-4">
                <p className="text-sm text-neutral-600">Choisissez une option de rémunération ou proposez une négociation.</p>
                {candOptions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-neutral-700">Options proposées par la boutique</p>
                    <ul className="space-y-2">
                      {candOptions.map((opt, i) => (
                        <li key={opt.id ?? i}>
                          <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${candSelectedOptionId === opt.id && !candIsNegotiation ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:bg-neutral-50/50'}`}>
                            <input
                              type="radio"
                              name="chat-option"
                              checked={candSelectedOptionId === opt.id && !candIsNegotiation}
                              onChange={() => { setCandSelectedOptionId(opt.id); setCandIsNegotiation(false); }}
                              className="mt-1 rounded-full border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                            />
                            <span className="text-sm text-neutral-900">{optionSummary(opt)}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="space-y-2">
                  <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${candIsNegotiation ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:bg-neutral-50/50'}`}>
                    <input
                      type="radio"
                      name="chat-option"
                      checked={candIsNegotiation}
                      onChange={() => { setCandIsNegotiation(true); setCandSelectedOptionId(null); }}
                      className="mt-1 rounded-full border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                    />
                    <span className="text-sm font-medium text-neutral-900">Tenter une négociation</span>
                  </label>
                  {candIsNegotiation && (
                    <textarea
                      value={candNegotiationMessage}
                      onChange={(e) => setCandNegotiationMessage(e.target.value)}
                      placeholder="Décrivez votre proposition (loyer, commission…)"
                      rows={3}
                      className="w-full ml-6 px-3 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none"
                    />
                  )}
                </div>
                <div>
                  <label htmlFor="chat-motivation" className="block text-sm font-medium text-neutral-900 mb-1">Message (optionnel)</label>
                  <textarea
                    id="chat-motivation"
                    value={candMotivationMessage}
                    onChange={(e) => setCandMotivationMessage(e.target.value)}
                    placeholder="Présentez votre marque…"
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none"
                  />
                </div>
              </div>
              <div className="p-4 border-t border-neutral-200 flex gap-2 justify-end">
                <button type="button" onClick={() => setShowCandidatureModal(false)} className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-700 font-medium hover:bg-neutral-50">Annuler</button>
                <button type="button" disabled={!canSubmitCandidature || candSubmitting} onClick={handleSubmitCandidatureFromChat} className="px-4 py-2 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-2">
                  {candSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Envoyer la candidature
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal : Demander un paiement depuis la messagerie */}
      {showPaymentModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" aria-hidden onClick={() => setShowPaymentModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 pointer-events-auto" role="dialog" aria-modal="true" aria-labelledby="chat-payment-title">
              <div className="flex items-center justify-between mb-4">
                <h2 id="chat-payment-title" className="text-lg font-semibold text-neutral-900">Demander un paiement</h2>
                <button type="button" onClick={() => setShowPaymentModal(false)} className="p-2 rounded-lg hover:bg-neutral-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-neutral-600 mb-4">
                La contrepartie recevra le montant indiqué. Des frais de service (2 %) s&apos;ajoutent au moment du paiement pour soutenir la plateforme.
              </p>
              {paymentRequestAsPayer === null ? (
                <div className="flex flex-col gap-3">
                  <button type="button" onClick={() => setPaymentRequestAsPayer(true)} className="w-full px-4 py-3.5 rounded-xl border-2 border-neutral-300 bg-white text-left font-semibold text-neutral-900 hover:border-neutral-900 hover:bg-neutral-50">
                    Je paie la contrepartie
                  </button>
                  <button type="button" onClick={() => setPaymentRequestAsPayer(false)} className="w-full px-4 py-3.5 rounded-xl border-2 border-neutral-300 bg-white text-left font-semibold text-neutral-900 hover:border-neutral-900 hover:bg-neutral-50">
                    Je demande à être payé par la contrepartie
                  </button>
                </div>
              ) : (
                <>
                  {paymentError && <p className="text-sm text-red-600 mb-2">{paymentError}</p>}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">Montant (€)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="0,00"
                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm"
                      />
                      <p className="text-xs text-neutral-500 mt-1">Frais de service 2 % au moment du paiement.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">Motif du paiement</label>
                      <input
                        type="text"
                        value={paymentMotif}
                        onChange={(e) => setPaymentMotif(e.target.value)}
                        placeholder="Ex. Règlement ventes janvier"
                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">Pièce jointe (optionnel)</label>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls"
                        onChange={(e) => setPaymentFile(e.target.files?.[0] ?? null)}
                        className="w-full text-sm text-neutral-600 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border file:border-neutral-200 file:bg-neutral-50"
                      />
                    </div>
                  </div>
                  <div className="mt-6 flex gap-2 justify-end">
                    <button type="button" onClick={() => setPaymentRequestAsPayer(null)} className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-700 font-medium">Retour</button>
                    <button type="button" onClick={() => setShowPaymentModal(false)} className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-700 font-medium">Annuler</button>
                    <button type="button" disabled={!paymentAmount.trim() || paymentSubmitting} onClick={handleSubmitPaymentFromChat} className="px-4 py-2 rounded-lg bg-neutral-900 text-white font-medium disabled:opacity-50 flex items-center gap-2">
                      {paymentSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                      Envoyer la demande
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal : Refuser une demande de paiement (motif) */}
      {paymentDeclineMessageId && paymentDeclineRequestId && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" aria-hidden onClick={() => { setPaymentDeclineMessageId(null); setPaymentDeclineRequestId(null); setPaymentDeclineNote(''); }} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 pointer-events-auto" role="dialog" aria-modal="true" aria-labelledby="payment-decline-title">
              <div className="flex items-center justify-between mb-4">
                <h2 id="payment-decline-title" className="text-lg font-semibold text-neutral-900">Refuser la demande de paiement</h2>
                <button type="button" onClick={() => { setPaymentDeclineMessageId(null); setPaymentDeclineRequestId(null); setPaymentDeclineNote(''); }} className="p-2 rounded-lg hover:bg-neutral-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-neutral-600 mb-3">Indiquez éventuellement le motif du refus (visible par la contrepartie).</p>
              <textarea
                value={paymentDeclineNote}
                onChange={(e) => setPaymentDeclineNote(e.target.value)}
                placeholder="Motif (optionnel)"
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none"
              />
              <div className="mt-4 flex gap-2 justify-end">
                <button type="button" onClick={() => { setPaymentDeclineMessageId(null); setPaymentDeclineRequestId(null); setPaymentDeclineNote(''); }} className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-700 font-medium">Annuler</button>
                <button type="button" disabled={paymentDeclineSubmitting} onClick={handleSubmitDeclinePayment} className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
                  {paymentDeclineSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                  Refuser
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal : Négocier une demande de paiement (montant proposé + message) */}
      {paymentNegotiateMessageId && paymentNegotiateRequestId && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" aria-hidden onClick={() => { setPaymentNegotiateMessageId(null); setPaymentNegotiateRequestId(null); setPaymentNegotiateAmount(''); setPaymentNegotiateMessage(''); }} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 pointer-events-auto" role="dialog" aria-modal="true" aria-labelledby="payment-negotiate-title">
              <div className="flex items-center justify-between mb-4">
                <h2 id="payment-negotiate-title" className="text-lg font-semibold text-neutral-900">Négocier le montant</h2>
                <button type="button" onClick={() => { setPaymentNegotiateMessageId(null); setPaymentNegotiateRequestId(null); setPaymentNegotiateAmount(''); setPaymentNegotiateMessage(''); }} className="p-2 rounded-lg hover:bg-neutral-100">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-neutral-600 mb-3">Proposez un autre montant ou précisez votre message. La demande sera marquée comme contestée et la contrepartie pourra en tenir compte.</p>
              <div className="space-y-3">
                <div>
                  <label htmlFor="payment-neg-amount" className="block text-sm font-medium text-neutral-700 mb-1">Montant proposé (€)</label>
                  <input
                    id="payment-neg-amount"
                    type="text"
                    inputMode="decimal"
                    value={paymentNegotiateAmount}
                    onChange={(e) => setPaymentNegotiateAmount(e.target.value)}
                    placeholder="ex. 250"
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-neutral-900 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="payment-neg-message" className="block text-sm font-medium text-neutral-700 mb-1">Message (optionnel)</label>
                  <textarea
                    id="payment-neg-message"
                    value={paymentNegotiateMessage}
                    onChange={(e) => setPaymentNegotiateMessage(e.target.value)}
                    placeholder="Ex. Je propose ce montant pour la période concernée."
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-neutral-900 text-sm resize-none"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2 justify-end">
                <button type="button" onClick={() => { setPaymentNegotiateMessageId(null); setPaymentNegotiateRequestId(null); setPaymentNegotiateAmount(''); setPaymentNegotiateMessage(''); }} className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-700 font-medium">Annuler</button>
                <button type="button" disabled={paymentNegotiateSubmitting || (!paymentNegotiateAmount.trim() && !paymentNegotiateMessage.trim())} onClick={handleSubmitNegotiatePayment} className="px-4 py-2 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-2">
                  {paymentNegotiateSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                  Envoyer la proposition
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
