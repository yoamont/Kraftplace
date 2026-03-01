'use client';

import { useState } from 'react';
import { MessageSquare, Loader2, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdminEntity } from '@/app/admin/context/AdminEntityContext';
import type { ConversationWithDetails, CandidatureStatus } from '@/lib/hooks/useConversations';

type Props = {
  conversations: ConversationWithDetails[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onRefresh: () => void;
  loading: boolean;
  entityType: 'brand' | 'showroom' | null;
};

function StatusChip({ status }: { status: CandidatureStatus }) {
  if (!status) return null;
  const config = {
    pending: { label: 'En attente', className: 'bg-amber-100 text-amber-800 border-amber-200' },
    accepted: { label: 'Validée - Chat ouvert', className: 'bg-green-100 text-green-800 border-green-200' },
    rejected: { label: 'Refusée - Crédit libéré', className: 'bg-neutral-100 text-neutral-600 border-neutral-200' },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded border ${c.className}`}>
      {c.label}
    </span>
  );
}

function SkeletonItem() {
  return (
    <div className="flex items-center gap-3 p-3 animate-pulse">
      <div className="w-12 h-12 rounded-full bg-neutral-200 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="h-4 bg-neutral-200 rounded w-1/2 mb-2" />
        <div className="h-3 bg-neutral-100 rounded w-3/4" />
      </div>
    </div>
  );
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onRefresh,
  loading,
  entityType,
}: Props) {
  const { activeBrand, refresh: refreshEntity } = useAdminEntity();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  async function handleCancelCandidature(conv: ConversationWithDetails, e: React.MouseEvent) {
    e.stopPropagation();
    if (!conv.pendingCandidatureMessageId || !activeBrand || entityType !== 'brand') return;
    if (!window.confirm('Annuler votre candidature ? Votre crédit réservé sera libéré.')) return;
    setCancellingId(conv.id);
    try {
      const { data: existing } = await supabase.from('messages').select('metadata').eq('id', conv.pendingCandidatureMessageId).single();
      const current = ((existing as { metadata?: Record<string, unknown> })?.metadata ?? {}) as Record<string, unknown>;
      await supabase.from('messages').update({ metadata: { ...current, status: 'cancelled', cancelled_at: new Date().toISOString() }, updated_at: new Date().toISOString() }).eq('id', conv.pendingCandidatureMessageId);
      const reserved = typeof (activeBrand as { reserved_credits?: number }).reserved_credits === 'number' ? (activeBrand as { reserved_credits: number }).reserved_credits : 0;
      await supabase.from('brands').update({ reserved_credits: Math.max(0, reserved - 1) }).eq('id', activeBrand.id);
      refreshEntity();
      onRefresh();
    } finally {
      setCancellingId(null);
    }
  }

  if (loading) {
    return (
      <div className="divide-y divide-neutral-100">
        {[1, 2, 3].map((i) => (
          <SkeletonItem key={i} />
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-6 text-center text-neutral-500 text-sm">
        <MessageSquare className="h-10 w-10 mx-auto text-neutral-300 mb-2" />
        <p>Aucune conversation.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-neutral-100">
      {conversations.map((conv) => {
        const isActive = conv.id === activeId;
        return (
          <li key={conv.id}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => onSelect(conv.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(conv.id); } }}
              className={`w-full flex items-center gap-3 p-3 text-left transition-colors cursor-pointer ${
                isActive
                  ? 'bg-kraft-200 text-kraft-900'
                  : 'hover:bg-neutral-50 text-neutral-900'
              }`}
            >
              <span className="relative shrink-0">
                {conv.otherParty.avatar_url?.trim() ? (
                  <img
                    src={conv.otherParty.avatar_url.trim()}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover border border-neutral-200"
                  />
                ) : (
                  <span className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-neutral-500" />
                  </span>
                )}
                {conv.unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
                    {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                  </span>
                )}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">
                  {conv.otherParty.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {conv.candidatureStatus != null && (
                    <StatusChip status={conv.candidatureStatus} />
                  )}
                  <p className="text-xs text-neutral-500 truncate">
                    {conv.lastMessage?.content ?? 'Aucun message'}
                  </p>
                </div>
                {entityType === 'brand' && conv.candidatureStatus === 'pending' && conv.pendingCandidatureMessageId && (
                  <button
                    type="button"
                    onClick={(e) => handleCancelCandidature(conv, e)}
                    disabled={cancellingId === conv.id}
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-neutral-600 hover:text-red-600 disabled:opacity-60"
                  >
                    {cancellingId === conv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                    Annuler la candidature
                  </button>
                )}
              </div>
              {conv.lastMessage?.created_at && (
                <span className="text-[10px] text-neutral-400 shrink-0">
                  {new Date(conv.lastMessage.created_at).toLocaleTimeString(
                    'fr-FR',
                    { hour: '2-digit', minute: '2-digit' }
                  )}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
