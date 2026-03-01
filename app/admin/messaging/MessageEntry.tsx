'use client';

import type { UnifiedMessage } from '@/lib/supabase';
import { FileText, ExternalLink, CheckCircle, XCircle, MessageCircle, Calendar, Percent, Home, MapPin } from 'lucide-react';

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

/** Durée entre deux dates : "3 mois", "2 semaines", "1 mois". */
function formatDuration(start: string | null, end: string | null): string {
  if (!start || !end) return '';
  try {
    const a = new Date(start);
    const b = new Date(end);
    const months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
    const days = Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
    if (months >= 1) return `${months} mois`;
    if (days >= 14) return `${Math.round(days / 7)} semaines`;
    return `${days} jours`;
  } catch {
    return '';
  }
}

/** Période formatée : "Du 1 avr. au 30 juin 2026". */
function formatPeriod(start: string | null, end: string | null): string {
  if (!start || !end) return '';
  try {
    const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    return `Du ${fmt(new Date(start))} au ${fmt(new Date(end))}`;
  } catch {
    return '';
  }
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
}: Props) {
  const label = senderLabel(message, isMe, myLabel, otherUserName, brandDisplayName, showroomDisplayName);
  const badge = senderBadge(message);
  const timeStr = message.created_at
    ? new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false })
        .format(new Date(message.created_at))
        .replace(':', 'h')
    : '';
  const dateLabel = message.created_at
    ? new Date(message.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const meta = (message.metadata ?? {}) as Record<string, unknown>;
  const status = meta.status as string | undefined;

  const rentPeriodLabel = (period: unknown) =>
    period === 'week' ? '/sem.' : period === 'one_off' ? ' unique' : '/mois';

  const periodStr = formatPeriod(
    (meta.partnership_start_at as string) ?? null,
    (meta.partnership_end_at as string) ?? null
  );
  const durationStr = formatDuration(
    (meta.partnership_start_at as string) ?? null,
    (meta.partnership_end_at as string) ?? null
  );
  const lieuStr = [meta.showroom_name, meta.showroom_city].filter(Boolean).join(', ') || showroomDisplayName || null;

  const renderContractCard = (
    title: string,
    showActions: boolean,
    onAccept?: () => void,
    onDecline?: () => void,
    onNegotiate?: () => void,
    acceptLabel = 'Accepter',
    declineLabel = 'Refuser'
  ) => {
    const isPending = status === 'pending' || !status;
    const isAccepted = status === 'accepted';
    const isRejected = status === 'rejected';
    return (
      <div className="flex w-full justify-center my-2">
        <div className="w-full max-w-md rounded-[12px] bg-white border border-black/[0.06] p-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide shrink-0">{title}</p>
            {isPending && (
              <span className="shrink-0 text-[11px] font-medium text-amber-700 bg-amber-50/90 px-2 py-0.5 rounded-full">
                En attente
              </span>
            )}
            {isAccepted && (
              <span className="shrink-0 text-[11px] font-medium text-emerald-700 bg-emerald-50/90 px-2 py-0.5 rounded-full">
                Validé
              </span>
            )}
            {isRejected && (
              <span className="shrink-0 text-[11px] font-medium text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full">
                Refusé
              </span>
            )}
          </div>
          <div className="space-y-3">
            {(periodStr || durationStr) && (
              <div className="flex items-start gap-2.5">
                <Calendar className="h-4 w-4 text-neutral-400 shrink-0 mt-0.5" strokeWidth={1.5} />
                <div className="min-w-0">
                  <p className="text-sm text-neutral-500">Dates</p>
                  <p className="text-sm font-semibold text-neutral-900">
                    {periodStr}
                    {durationStr ? ` (Durée : ${durationStr})` : ''}
                  </p>
                </div>
              </div>
            )}
            {meta.commission_percent != null && (
              <div className="flex items-start gap-2.5">
                <Percent className="h-4 w-4 text-neutral-400 shrink-0 mt-0.5" strokeWidth={1.5} />
                <div className="min-w-0">
                  <p className="text-sm text-neutral-500">Commission</p>
                  <p className="text-sm font-semibold text-neutral-900">{String(meta.commission_percent)} %</p>
                </div>
              </div>
            )}
            {(meta.rent != null || meta.rent === 0) && (
              <div className="flex items-start gap-2.5">
                <Home className="h-4 w-4 text-neutral-400 shrink-0 mt-0.5" strokeWidth={1.5} />
                <div className="min-w-0">
                  <p className="text-sm text-neutral-500">Loyer</p>
                  <p className="text-sm font-semibold text-neutral-900">
                    {String(meta.rent)} €{rentPeriodLabel(meta.rent_period)}
                  </p>
                </div>
              </div>
            )}
            {!periodStr && meta.validity_days != null && (
              <div className="flex items-start gap-2.5">
                <Calendar className="h-4 w-4 text-neutral-400 shrink-0 mt-0.5" strokeWidth={1.5} />
                <div className="min-w-0">
                  <p className="text-sm text-neutral-500">Validité</p>
                  <p className="text-sm font-semibold text-neutral-900">{String(meta.validity_days)} jours</p>
                </div>
              </div>
            )}
            {lieuStr && (
              <div className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-neutral-400 shrink-0 mt-0.5" strokeWidth={1.5} />
                <div className="min-w-0">
                  <p className="text-sm text-neutral-500">Lieu</p>
                  <p className="text-sm font-semibold text-neutral-900">{lieuStr}</p>
                </div>
              </div>
            )}
            {meta.option_description && (
              <p className="text-sm text-neutral-600 pt-0.5">{String(meta.option_description)}</p>
            )}
            {meta.negotiation_message && (
              <p className="text-sm text-neutral-600 italic pt-0.5">{String(meta.negotiation_message)}</p>
            )}
          </div>
          {showActions && isPending && (onAccept || onDecline || onNegotiate) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {onAccept && (
                <button type="button" onClick={onAccept} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors">
                  <CheckCircle className="h-4 w-4" strokeWidth={1.5} /> {acceptLabel}
                </button>
              )}
              {onDecline && (
                <button type="button" onClick={onDecline} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-black/[0.08] text-neutral-700 text-sm font-medium hover:bg-neutral-50 transition-colors">
                  <XCircle className="h-4 w-4" strokeWidth={1.5} /> {declineLabel}
                </button>
              )}
              {onNegotiate && (
                <button type="button" onClick={onNegotiate} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-black/[0.08] text-neutral-700 text-sm font-medium hover:bg-neutral-50 transition-colors">
                  <MessageCircle className="h-4 w-4" strokeWidth={1.5} /> Négocier
                </button>
              )}
            </div>
          )}
          <span className="text-[10px] text-neutral-400 mt-3 block">{timeStr}</span>
        </div>
      </div>
    );
  };

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
      const dealPending = status === 'pending' || !status;
      const dealAccepted = status === 'accepted';
      const dealRejected = status === 'rejected';
      return (
        <div className="flex w-full justify-center my-2">
          <div className="w-full max-w-md rounded-[12px] bg-white border border-black/[0.06] p-4">
            <div className="flex items-start justify-between gap-3 mb-4">
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide shrink-0">Offre</p>
              {dealPending && (
                <span className="shrink-0 text-[11px] font-medium text-amber-700 bg-amber-50/90 px-2 py-0.5 rounded-full">En attente</span>
              )}
              {dealAccepted && (
                <span className="shrink-0 text-[11px] font-medium text-emerald-700 bg-emerald-50/90 px-2 py-0.5 rounded-full">Validé</span>
              )}
              {dealRejected && (
                <span className="shrink-0 text-[11px] font-medium text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full">Refusé</span>
              )}
            </div>
            <div className="space-y-3">
              {(periodStr || durationStr) && (
                <div className="flex items-start gap-2.5">
                  <Calendar className="h-4 w-4 text-neutral-400 shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div className="min-w-0">
                    <p className="text-sm text-neutral-500">Dates</p>
                    <p className="text-sm font-semibold text-neutral-900">
                      {periodStr}{durationStr ? ` (Durée : ${durationStr})` : ''}
                    </p>
                  </div>
                </div>
              )}
              {meta.commission_percent != null && (
                <div className="flex items-start gap-2.5">
                  <Percent className="h-4 w-4 text-neutral-400 shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div className="min-w-0">
                    <p className="text-sm text-neutral-500">Commission</p>
                    <p className="text-sm font-semibold text-neutral-900">{String(meta.commission_percent)} %</p>
                  </div>
                </div>
              )}
              {(meta.rent != null || meta.rent === 0) && (
                <div className="flex items-start gap-2.5">
                  <Home className="h-4 w-4 text-neutral-400 shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div className="min-w-0">
                    <p className="text-sm text-neutral-500">Loyer</p>
                    <p className="text-sm font-semibold text-neutral-900">
                      {String(meta.rent)} €{rentPeriodLabel(meta.rent_period)}
                    </p>
                  </div>
                </div>
              )}
              {!periodStr && meta.validity_days != null && (
                <div className="flex items-start gap-2.5">
                  <Calendar className="h-4 w-4 text-neutral-400 shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div className="min-w-0">
                    <p className="text-sm text-neutral-500">Validité</p>
                    <p className="text-sm font-semibold text-neutral-900">{String(meta.validity_days)} jours</p>
                  </div>
                </div>
              )}
              {lieuStr && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-neutral-400 shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div className="min-w-0">
                    <p className="text-sm text-neutral-500">Lieu</p>
                    <p className="text-sm font-semibold text-neutral-900">{lieuStr}</p>
                  </div>
                </div>
              )}
              {meta.option_description && <p className="text-sm text-neutral-600 pt-0.5">{String(meta.option_description)}</p>}
            </div>
            {dealPending && onAcceptDeal && onDeclineDeal && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => onAcceptDeal(message.id)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors">
                  <CheckCircle className="h-4 w-4" strokeWidth={1.5} /> Accepter
                </button>
                <button type="button" onClick={() => onDeclineDeal(message.id)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-black/[0.08] text-neutral-700 text-sm font-medium hover:bg-neutral-50 transition-colors">
                  <XCircle className="h-4 w-4" strokeWidth={1.5} /> Refuser
                </button>
              </div>
            )}
            <span className="text-[10px] text-neutral-400 mt-3 block">{timeStr}</span>
          </div>
        </div>
      );
    }

    case 'CANDIDATURE_SENT': {
      const canRespond = viewerRole === 'boutique' && (status === 'pending' || !status);
      return renderContractCard(
        dateLabel ? `Candidature envoyée le ${dateLabel}` : 'Candidature envoyée',
        canRespond,
        onAcceptCandidature ? () => onAcceptCandidature(message.id) : undefined,
        onDeclineCandidature ? () => onDeclineCandidature(message.id) : undefined,
        onNegotiateCandidature ? () => onNegotiateCandidature(message.id) : undefined,
        'Accepter (Ouvrir le chat)',
        'Décliner'
      );
    }

    case 'OFFER_NEGOTIATED': {
      const otherPartyCanRespond = viewerRole != null && message.sender_role !== viewerRole && (status === 'pending' || !status);
      return renderContractCard(
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
          <div className="w-full max-w-md rounded-[12px] bg-white border border-black/[0.06] p-4">
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

    case 'DEAL_ACCEPTED':
    case 'DEAL_DECLINED':
    case 'DEAL_EXPIRED':
    case 'CANDIDATURE_ACCEPTED':
    case 'CANDIDATURE_REFUSED': {
      const acceptedOrDeclined = message.type === 'DEAL_ACCEPTED' || message.type === 'CANDIDATURE_ACCEPTED'
        ? 'Candidature acceptée'
        : message.type === 'DEAL_DECLINED' || message.type === 'CANDIDATURE_REFUSED'
          ? 'Candidature refusée'
          : 'Offre expirée';
      const statusLabel = (acceptedOrDeclined === 'Candidature acceptée' || acceptedOrDeclined === 'Candidature refusée') && dateLabel
        ? `${acceptedOrDeclined} le ${dateLabel}`
        : acceptedOrDeclined;
      const isPositive = message.type === 'DEAL_ACCEPTED' || message.type === 'CANDIDATURE_ACCEPTED';
      const showUnlockSubtitle = message.type === 'CANDIDATURE_ACCEPTED' && viewerRole === 'brand';
      return (
        <div className="flex w-full justify-center my-2">
          <div className="flex flex-col items-center gap-1">
            <span className={`text-xs py-1.5 px-3 rounded-full text-center ${isPositive ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-600'}`}>
              {statusLabel}
            </span>
            {showUnlockSubtitle && (
              <span className="text-[11px] font-light text-neutral-500">Chat débloqué & Crédit débité</span>
            )}
          </div>
        </div>
      );
    }

    case 'PAYMENT_REQUEST':
      // Paiements désactivés (modèle 100 % leads) - affichage neutre
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
