'use client';

import { Send, CheckCircle, RefreshCw, Info } from 'lucide-react';
import type { CandidatureThreadMessage } from '@/lib/supabase';

type MessageItemProps = {
  message: CandidatureThreadMessage;
  /** Côté du viewer pour aligner les bulles (brand | showroom) */
  viewerSide?: 'brand' | 'showroom';
  /** Nom à afficher pour l'expéditeur (marque ou boutique) */
  senderLabel?: string;
};

function formatSystemLabel(message: CandidatureThreadMessage): string {
  switch (message.type) {
    case 'system_offer_sent': {
      const m = message.metadata as { commission_percent?: number; rent?: number; rent_period?: string; validity_days?: number; option_description?: string } | null;
      if (!m) return 'Offre envoyée';
      const parts: string[] = ['Offre envoyée'];
      if (m.commission_percent != null) parts.push(`commission ${m.commission_percent} %`);
      if (m.rent != null && m.rent > 0) parts.push(`${m.rent}€${m.rent_period === 'week' ? '/sem.' : m.rent_period === 'one_off' ? ' (unique)' : '/mois'}`);
      if (m.validity_days != null) parts.push(`valable ${m.validity_days} j`);
      if (m.option_description) parts.push(m.option_description);
      return parts.join(' · ');
    }
    case 'system_offer_accepted': {
      const m = message.metadata as { accepted_at?: string; validity_days?: number } | null;
      if (!m) return 'Offre acceptée';
      return m.validity_days != null ? `Offre acceptée · validité ${m.validity_days} jours` : 'Offre acceptée';
    }
    case 'system_status_update':
      return (message.metadata as { label?: string })?.label ?? 'Statut mis à jour';
    default:
      return 'Événement';
  }
}

function SystemIcon({ type }: { type: string }) {
  if (type === 'system_offer_sent') return <Send className="h-3.5 w-3.5 text-neutral-500 shrink-0" />;
  if (type === 'system_offer_accepted') return <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />;
  if (type === 'system_status_update') return <Info className="h-3.5 w-3.5 text-amber-600 shrink-0" />;
  return <RefreshCw className="h-3.5 w-3.5 text-neutral-500 shrink-0" />;
}

export function MessageItem({ message, viewerSide, senderLabel }: MessageItemProps) {
  const isSystem = message.type.startsWith('system_');

  if (isSystem) {
    const label = formatSystemLabel(message);
    return (
      <div className="flex justify-center my-2" role="status" aria-label={label}>
        <span className="inline-flex items-center gap-2 bg-neutral-100 text-neutral-600 text-xs py-1.5 px-3 rounded-full border border-neutral-200/80">
          <SystemIcon type={message.type} />
          <span>{label}</span>
        </span>
        {message.created_at && (
          <span className="sr-only">
            {new Date(message.created_at).toLocaleString('fr-FR')}
          </span>
        )}
      </div>
    );
  }

  // Message utilisateur : bulle classique
  const isMe =
    viewerSide === 'brand'
      ? message.sender_role === 'brand'
      : viewerSide === 'showroom'
        ? message.sender_role === 'boutique'
        : false;
  const content = message.content ?? '';

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} my-1.5`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
          isMe ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-900 border border-neutral-200'
        }`}
      >
        {senderLabel && (
          <p className="text-[10px] font-medium text-neutral-500 mb-0.5">{senderLabel}</p>
        )}
        <p className="whitespace-pre-wrap break-words">{content}</p>
        {message.created_at && (
          <p className="text-[10px] text-neutral-500 mt-1">
            {new Date(message.created_at).toLocaleString('fr-FR')}
          </p>
        )}
      </div>
    </div>
  );
}
