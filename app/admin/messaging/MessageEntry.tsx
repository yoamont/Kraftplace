'use client';

import type { UnifiedMessage } from '@/lib/supabase';
import { FileText, ExternalLink, CheckCircle, XCircle, MessageCircle } from 'lucide-react';

type Props = {
  message: UnifiedMessage;
  isMe: boolean;
  myLabel: string;
  otherUserName: string;
  /** Nom de la marque (pour afficher selon sender_role) */
  brandDisplayName?: string;
  /** Nom de la boutique (pour afficher selon sender_role) */
  showroomDisplayName?: string;
  /** Côté qui regarde : pour afficher Accepter/Refuser/Négocier côté boutique uniquement sur CANDIDATURE_SENT */
  viewerRole?: 'brand' | 'boutique';
  onAcceptDeal?: (messageId: string) => void;
  onDeclineDeal?: (messageId: string) => void;
  onSignContract?: (messageId: string) => void;
  /** Candidature unifiée : accepter / refuser / négocier */
  onAcceptCandidature?: (messageId: string) => void;
  onDeclineCandidature?: (messageId: string) => void;
  onNegotiateCandidature?: (messageId: string) => void;
  /** Demande de paiement : accepter / refuser / négocier (paymentRequestId pour mise à jour table payment_requests) */
  onAcceptPayment?: (messageId: string, paymentRequestId: string) => void;
  onDeclinePayment?: (messageId: string, paymentRequestId: string) => void;
  onNegotiatePayment?: (messageId: string, paymentRequestId: string) => void;
};

function senderLabel(
  message: UnifiedMessage,
  isMe: boolean,
  myLabel: string,
  otherUserName: string,
  brandDisplayName?: string,
  showroomDisplayName?: string
): string {
  if (message.sender_role === 'brand' && brandDisplayName) return brandDisplayName;
  if (message.sender_role === 'boutique' && showroomDisplayName) return showroomDisplayName;
  return isMe ? myLabel : otherUserName;
}

function senderBadge(message: UnifiedMessage): string | null {
  if (message.sender_role === 'brand') return 'Marque';
  if (message.sender_role === 'boutique') return 'Boutique';
  return null;
}

export function MessageEntry({
  message,
  isMe,
  myLabel,
  otherUserName,
  brandDisplayName,
  showroomDisplayName,
  viewerRole,
  onAcceptDeal,
  onDeclineDeal,
  onSignContract,
  onAcceptCandidature,
  onDeclineCandidature,
  onNegotiateCandidature,
  onAcceptPayment,
  onDeclinePayment,
  onNegotiatePayment,
}: Props) {
  const label = senderLabel(message, isMe, myLabel, otherUserName, brandDisplayName, showroomDisplayName);
  const badge = senderBadge(message);
  const timeStr = message.created_at
    ? new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false })
        .format(new Date(message.created_at))
        .replace(':', 'h')
    : '';
  const meta = (message.metadata ?? {}) as Record<string, unknown>;
  const status = meta.status as string | undefined;

  const rentPeriodLabel = (period: unknown) =>
    period === 'week' ? '/sem.' : period === 'one_off' ? ' unique' : '/mois';

  const renderOfferCard = (
    title: string,
    showActions: boolean,
    onAccept?: () => void,
    onDecline?: () => void,
    onNegotiate?: () => void
  ) => (
    <div className="flex w-full justify-center my-2">
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-neutral-50 p-4 shadow-sm">
        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">{title}</p>
        <div className="space-y-1 text-sm text-neutral-700">
          {meta.commission_percent != null && <p>Commission : {String(meta.commission_percent)} %</p>}
          {meta.rent != null && <p>Loyer : {String(meta.rent)} €{rentPeriodLabel(meta.rent_period)}</p>}
          {meta.partnership_start_at != null && meta.partnership_end_at != null && (
            <p>Partenariat : du {new Date(meta.partnership_start_at as string).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} au {new Date(meta.partnership_end_at as string).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          )}
          {meta.validity_days != null && !meta.partnership_start_at && !meta.partnership_end_at && <p>Validité : {String(meta.validity_days)} jours</p>}
          {meta.option_description && <p className="text-neutral-600">{String(meta.option_description)}</p>}
          {meta.negotiation_message && <p className="text-neutral-600 italic">{String(meta.negotiation_message)}</p>}
        </div>
        {showActions && (status === 'pending' || !status) && (onAccept || onDecline || onNegotiate) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {onAccept && (
              <button type="button" onClick={onAccept} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700">
                <CheckCircle className="h-4 w-4" /> Accepter
              </button>
            )}
            {onDecline && (
              <button type="button" onClick={onDecline} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-sm font-medium hover:bg-red-50">
                <XCircle className="h-4 w-4" /> Refuser
              </button>
            )}
            {onNegotiate && (
              <button type="button" onClick={onNegotiate} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-neutral-700 text-sm font-medium hover:bg-neutral-50">
                <MessageCircle className="h-4 w-4" /> Négocier
              </button>
            )}
          </div>
        )}
        {status === 'accepted' && <p className="mt-2 text-sm text-green-600 font-medium">Offre acceptée</p>}
        {status === 'declined' && <p className="mt-2 text-sm text-red-600 font-medium">Offre refusée</p>}
        <span className="text-[10px] text-neutral-400 mt-2 block">{timeStr}</span>
      </div>
    </div>
  );

  switch (message.type) {
    case 'CHAT':
      return (
        <div className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
          <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
            <span className={`text-xs text-neutral-500 mb-1 flex items-center gap-1.5 ${isMe ? 'mr-1' : 'ml-1'}`}>
              {badge && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${isMe ? 'bg-stone-700 text-stone-200' : 'bg-neutral-200 text-neutral-600'}`}>
                  {badge}
                </span>
              )}
              {label}
            </span>
            <div
              className={`rounded-2xl px-4 py-2 ${
                isMe ? 'bg-stone-800 text-white rounded-br-none' : 'bg-neutral-100 text-neutral-900 rounded-bl-none'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap break-words">{message.content ?? ''}</p>
            </div>
            <span className={`text-[10px] text-neutral-400 mt-1 ${isMe ? 'mr-1' : 'ml-1'}`}>{timeStr}</span>
          </div>
        </div>
      );

    case 'DEAL_SENT': {
      const commission = meta.commission_percent;
      const rent = meta.rent;
      const rentPeriod = meta.rent_period === 'month' ? '/mois' : meta.rent_period === 'week' ? '/sem.' : '';
      const isPending = status === 'pending' || !status;
      return (
        <div className="flex w-full justify-center my-2">
          <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-neutral-50 p-4 shadow-sm">
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Offre</p>
            <div className="space-y-1 text-sm text-neutral-700">
              {commission != null && <p>Commission : {String(commission)} %</p>}
              {rent != null && <p>Loyer : {String(rent)} €{rentPeriod}</p>}
              {meta.partnership_start_at != null && meta.partnership_end_at != null && (
                <p>Partenariat : du {new Date(meta.partnership_start_at as string).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} au {new Date(meta.partnership_end_at as string).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              )}
              {meta.validity_days != null && !meta.partnership_start_at && !meta.partnership_end_at && <p>Validité : {String(meta.validity_days)} jours</p>}
              {meta.option_description && <p className="text-neutral-600">{String(meta.option_description)}</p>}
            </div>
            {isPending && onAcceptDeal && onDeclineDeal && (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => onAcceptDeal(message.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4" /> Accepter
                </button>
                <button
                  type="button"
                  onClick={() => onDeclineDeal(message.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-sm font-medium hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4" /> Refuser
                </button>
              </div>
            )}
            {status === 'accepted' && <p className="mt-2 text-sm text-green-600 font-medium">Offre acceptée</p>}
            {status === 'declined' && <p className="mt-2 text-sm text-red-600 font-medium">Offre refusée</p>}
            <span className="text-[10px] text-neutral-400 mt-2 block">{timeStr}</span>
          </div>
        </div>
      );
    }

    case 'CANDIDATURE_SENT': {
      const canRespond = viewerRole === 'boutique' && (status === 'pending' || !status);
      return renderOfferCard(
        'Candidature envoyée',
        canRespond,
        onAcceptCandidature ? () => onAcceptCandidature(message.id) : undefined,
        onDeclineCandidature ? () => onDeclineCandidature(message.id) : undefined,
        onNegotiateCandidature ? () => onNegotiateCandidature(message.id) : undefined
      );
    }

    case 'OFFER_NEGOTIATED': {
      const otherPartyCanRespond = viewerRole != null && message.sender_role !== viewerRole && (status === 'pending' || !status);
      return renderOfferCard(
        'Proposition mise à jour',
        !!otherPartyCanRespond,
        onAcceptCandidature ? () => onAcceptCandidature(message.id) : undefined,
        onDeclineCandidature ? () => onDeclineCandidature(message.id) : undefined,
        onNegotiateCandidature ? () => onNegotiateCandidature(message.id) : undefined
      );
    }

    case 'CONTRAT': {
      const documentUrl = meta.document_url as string | undefined;
      const isSigned = status === 'signed';
      return (
        <div className="flex w-full justify-center my-2">
          <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-neutral-50 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-800">
              <FileText className="h-4 w-4 text-neutral-500" />
              Contrat
            </div>
            <p className="text-sm text-neutral-600 mt-1">{message.content ?? 'Contrat de partenariat'}</p>
            {documentUrl && (
              <a
                href={documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-sm text-kraft-700 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Voir le PDF
              </a>
            )}
            {!isSigned && onSignContract && (
              <button
                type="button"
                onClick={() => onSignContract(message.id)}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 text-white text-sm font-medium hover:bg-stone-700"
              >
                Signer
              </button>
            )}
            {isSigned && <p className="mt-2 text-sm text-green-600 font-medium">Contrat signé</p>}
            <span className="text-[10px] text-neutral-400 mt-2 block">{timeStr}</span>
          </div>
        </div>
      );
    }

    case 'DOCUMENT':
      const docUrl = meta.document_url as string | undefined;
      const filename = (meta.filename as string) ?? 'Document';
      return (
        <div className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
          <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
            <span className={`text-xs text-neutral-500 mb-1 ${isMe ? 'mr-1' : 'ml-1'}`}>
              {isMe ? myLabel : otherUserName}
            </span>
            <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-neutral-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">{filename}</p>
                  {docUrl && (
                    <a
                      href={docUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-kraft-700 hover:underline inline-flex items-center gap-1"
                    >
                      Télécharger <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
            <span className={`text-[10px] text-neutral-400 mt-1 ${isMe ? 'mr-1' : 'ml-1'}`}>{timeStr}</span>
          </div>
        </div>
      );

    case 'PAYMENT_REQUEST': {
      const amount = meta.amount_cents != null ? Number(meta.amount_cents) / 100 : null;
      const paymentStatus = (meta.status as string) ?? 'pending';
      const paymentRequestId = meta.payment_request_id as string | undefined;
      const canRespondPayment = paymentRequestId && paymentStatus === 'pending' && viewerRole != null && message.sender_role !== viewerRole;
      return (
        <div className="flex w-full justify-center my-2">
          <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-amber-50/50 p-4 shadow-sm">
            <p className="text-xs font-medium text-amber-800 uppercase tracking-wide">Demande de paiement</p>
            {amount != null && <p className="text-sm font-semibold text-neutral-900 mt-1">{amount.toFixed(2)} €</p>}
            {meta.motif && <p className="text-sm text-neutral-600 mt-0.5">{String(meta.motif)}</p>}
            {canRespondPayment && (onAcceptPayment || onDeclinePayment || onNegotiatePayment) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {onAcceptPayment && (
                  <button type="button" onClick={() => onAcceptPayment(message.id, paymentRequestId)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700">
                    <CheckCircle className="h-4 w-4" /> Accepter
                  </button>
                )}
                {onDeclinePayment && (
                  <button type="button" onClick={() => onDeclinePayment(message.id, paymentRequestId)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-sm font-medium hover:bg-red-50">
                    <XCircle className="h-4 w-4" /> Refuser
                  </button>
                )}
                {onNegotiatePayment && (
                  <button type="button" onClick={() => onNegotiatePayment(message.id, paymentRequestId)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-neutral-700 text-sm font-medium hover:bg-neutral-50">
                    <MessageCircle className="h-4 w-4" /> Négocier
                  </button>
                )}
              </div>
            )}
            {!canRespondPayment && (
              <p className="text-xs text-neutral-600 mt-1">
                {paymentStatus === 'accepted' && 'Accepté'}
                {paymentStatus === 'completed' && 'Paiement effectué'}
                {paymentStatus === 'pending' && 'En attente'}
                {paymentStatus === 'contested' && 'Contesté'}
              </p>
            )}
            {meta.contest_note && paymentStatus === 'contested' && (
              <p className="text-xs text-amber-800 bg-amber-100/80 rounded-lg px-2 py-1 mt-2">{String(meta.contest_note)}</p>
            )}
            <span className="text-[10px] text-neutral-400 mt-2 block">{timeStr}</span>
          </div>
        </div>
      );
    }

    case 'DEAL_ACCEPTED':
    case 'DEAL_DECLINED':
    case 'DEAL_EXPIRED':
    case 'CANDIDATURE_ACCEPTED':
    case 'CANDIDATURE_REFUSED': {
      const statusLabel =
        message.type === 'DEAL_ACCEPTED' || message.type === 'CANDIDATURE_ACCEPTED'
          ? 'Candidature acceptée'
          : message.type === 'DEAL_DECLINED' || message.type === 'CANDIDATURE_REFUSED'
            ? 'Candidature refusée'
            : 'Offre expirée';
      const isPositive = message.type === 'DEAL_ACCEPTED' || message.type === 'CANDIDATURE_ACCEPTED';
      return (
        <div className="flex w-full justify-center my-2">
          <span className={`text-xs py-1.5 px-3 rounded-full text-center ${isPositive ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-600'}`}>
            {statusLabel}
          </span>
        </div>
      );
    }

    default:
      return (
        <div className="flex w-full justify-center my-2">
          <span className="bg-neutral-100 text-neutral-500 text-xs py-1 px-3 rounded-full">
            {message.content ?? message.type}
          </span>
        </div>
      );
  }
}
