'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAdminEntity } from '@/app/admin/context/AdminEntityContext';
import { useConversations } from '@/lib/hooks/useConversations';
import { ConversationList } from '@/app/admin/messaging/ConversationList';
import { ChatView } from '@/app/admin/messaging/ChatView';
import { EntitySelector } from '@/app/admin/components/EntitySelector';

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userId, entityType, activeBrand, activeShowroom, loading: entityLoading } = useAdminEntity();
  const { conversations, loading, refresh } = useConversations(
    userId,
    activeBrand ?? null,
    activeShowroom ?? null
  );

  const conversationIdParam = searchParams.get('conversationId');
  const [selectedId, setSelectedId] = useState<string | null>(conversationIdParam);

  useEffect(() => {
    if (conversationIdParam) {
      setSelectedId(conversationIdParam);
      refresh();
    }
  }, [conversationIdParam, refresh]);

  const selected = conversations.find((c) => c.id === selectedId);
  /** ID utilisé pour charger les messages : candidature_id si disponible, sinon conversation_id (fallback) */
  const activeMessageId = selected?.candidatureId ?? selectedId;
  const messageMode = selected?.candidatureId ? ('candidature' as const) : ('conversation' as const);

  useEffect(() => {
    if (!entityLoading && !userId) router.replace('/login');
  }, [entityLoading, userId, router]);

  if (entityLoading || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-neutral-500">Chargement…</p>
      </div>
    );
  }

  if (entityType !== 'brand' && entityType !== 'showroom') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-neutral-600">
          Sélectionnez une marque ou une boutique dans le sélecteur pour accéder à la messagerie.
        </p>
      </div>
    );
  }

  const otherUser = selected
    ? { name: selected.otherParty.name, avatarUrl: selected.otherParty.avatar_url }
    : { name: '', avatarUrl: null as string | null };
  const myLabel = activeBrand?.brand_name ?? activeShowroom?.name ?? 'Vous';

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden">
      {/* SIDEBAR */}
      <div className="w-1/3 lg:w-1/4 border-r border-neutral-200 h-full flex flex-col bg-neutral-50/50">
        <div className="shrink-0 p-3 border-b border-neutral-200 bg-white">
          <h1 className="text-lg font-semibold text-neutral-900">Messagerie</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            {entityType === 'brand'
              ? 'Conversations avec les boutiques'
              : entityType === 'showroom'
                ? 'Conversations avec les marques'
                : 'Messagerie'}
          </p>
          <div className="mt-3">
            <EntitySelector />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          <ConversationList
            conversations={conversations}
            activeId={selectedId}
            onSelect={setSelectedId}
            loading={loading}
          />
        </div>
      </div>

      {/* CHAT VIEW : header + messages + input (hauteurs fixes, pas d'imbrication flex fragile) */}
      <div className="flex-1 flex flex-col h-full relative min-w-0">
        <ChatView
          conversationId={selectedId}
          candidatureId={selected?.candidatureId ?? null}
          activeMessageId={activeMessageId}
          messageMode={messageMode}
          currentUserId={userId}
          entityType={entityType ?? null}
          otherUserName={otherUser.name}
          otherUserAvatarUrl={otherUser.avatarUrl}
          myLabel={myLabel}
        />
      </div>
    </div>
  );
}
