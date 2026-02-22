'use client';

import { useChat } from '@/lib/hooks/useChat';
import { MessageEntry } from '@/app/admin/messaging/MessageEntry';
import { Loader2 } from 'lucide-react';
import { getOrCreateConversationId } from '@/lib/conversations';
import { useState, useEffect } from 'react';

type MessageListProps = {
  /** Candidature (brand_id, showroom_id) pour résoudre la conversation */
  brandId: number;
  showroomId: number;
  /** Côté du viewer pour isMe */
  viewerSide: 'brand' | 'showroom';
  brandLabel?: string;
  showroomLabel?: string;
  currentUserId: string | null;
};

/**
 * Affiche le fil de messages unifié par conversation_id (même source que la messagerie).
 */
export function MessageList({
  brandId,
  showroomId,
  viewerSide,
  brandLabel = 'Marque',
  showroomLabel = 'Boutique',
  currentUserId,
}: MessageListProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getOrCreateConversationId(brandId, showroomId).then((id) => {
      if (!cancelled) setConversationId(id);
    });
    return () => { cancelled = true; };
  }, [brandId, showroomId]);

  const { messages, loading } = useChat(conversationId, currentUserId);
  const myLabel = viewerSide === 'brand' ? brandLabel : showroomLabel;
  const otherUserName = viewerSide === 'brand' ? showroomLabel : brandLabel;

  if (conversationId == null) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" aria-hidden />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" aria-hidden />
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className="py-6 text-center text-sm text-neutral-500">
        Aucun message pour le moment. Les événements (offre envoyée, acceptée) s'afficheront ici.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((m) => {
        const isMe =
          m.sender_id != null && currentUserId != null && m.sender_id === currentUserId;
        return (
          <MessageEntry
            key={m.id}
            message={m}
            isMe={isMe}
            myLabel={myLabel}
            otherUserName={otherUserName}
            brandDisplayName={brandLabel}
            showroomDisplayName={showroomLabel}
          />
        );
      })}
    </div>
  );
}
