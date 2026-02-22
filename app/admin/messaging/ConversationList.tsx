'use client';

import { MessageSquare } from 'lucide-react';
import type { ConversationWithDetails } from '@/lib/hooks/useConversations';

type Props = {
  conversations: ConversationWithDetails[];
  activeId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
};

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
  loading,
}: Props) {
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
            <button
              type="button"
              onClick={() => onSelect(conv.id)}
              className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
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
                <p className="text-xs text-neutral-500 truncate mt-0.5">
                  {conv.lastMessage?.content ?? 'Aucun message'}
                </p>
              </div>
              {conv.lastMessage?.created_at && (
                <span className="text-[10px] text-neutral-400 shrink-0">
                  {new Date(conv.lastMessage.created_at).toLocaleTimeString(
                    'fr-FR',
                    { hour: '2-digit', minute: '2-digit' }
                  )}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
