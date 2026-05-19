'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAdminEntity } from '@/app/admin/context/AdminEntityContext';
import { useConversations } from '@/lib/hooks/useConversations';
import { ConversationList } from '@/app/admin/messaging/ConversationList';
import { ChatView } from '@/app/admin/messaging/ChatView';
import { EntitySelector } from '@/app/admin/components/EntitySelector';
import { Search, X } from 'lucide-react';

export default function AdminMessagesPage() {
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
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) =>
      c.otherParty.name.toLowerCase().includes(q) ||
      c.lastMessage?.content?.toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  const selectConversation = (id: string) => {
    setSelectedId(id);
    router.replace(`/admin/messages?conversationId=${id}`, { scroll: false });
  };

  const backToList = () => {
    setSelectedId(null);
    router.replace('/admin/messages', { scroll: false });
  };

  useEffect(() => {
    if (conversationIdParam) {
      setSelectedId(conversationIdParam);
      refresh();
    }
  }, [conversationIdParam, refresh]);

  useEffect(() => {
    if (!entityLoading && !userId) router.replace('/login');
  }, [entityLoading, userId, router]);

  if (entityLoading || !userId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-neutral-500 text-sm">Chargement…</p>
      </div>
    );
  }

  if (entityType !== 'brand' && entityType !== 'showroom') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-neutral-600 text-sm text-center max-w-xs">
          Sélectionnez une marque ou une boutique dans le sélecteur pour accéder à la messagerie.
        </p>
      </div>
    );
  }

  const selected = conversations.find((c) => c.id === selectedId);
  const otherUser = selected
    ? { name: selected.otherParty.name, avatarUrl: selected.otherParty.avatar_url }
    : { name: '', avatarUrl: null as string | null };
  const myLabel = activeBrand?.brand_name ?? activeShowroom?.name ?? 'Vous';

  return (
    // Escape admin layout padding to fill full height
    <div className="flex -mx-4 -my-4 lg:-mx-6 lg:-my-6 overflow-hidden" style={{ height: 'calc(100% + 2rem)' }}>

      {/* Liste des conversations */}
      <div
        className={`w-full md:w-1/3 lg:w-1/4 border-r border-neutral-200 h-full flex flex-col bg-neutral-50/50 ${selectedId ? 'hidden md:flex' : ''}`}
        aria-hidden={!!selectedId}
      >
        <div className="shrink-0 p-4 border-b border-neutral-200 bg-white">
          <h1 className="text-base font-semibold text-neutral-900">Messagerie</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            {entityType === 'brand' ? 'Conversations avec les boutiques' : 'Conversations avec les marques'}
          </p>
          <div className="mt-3">
            <EntitySelector />
          </div>
          <div className="mt-2 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400 pointer-events-none" strokeWidth={1.5} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher…"
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-black/[0.08] bg-neutral-50 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-300"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          <ConversationList
            conversations={filteredConversations}
            activeId={selectedId}
            onSelect={selectConversation}
            onRefresh={refresh}
            loading={loading}
            entityType={entityType}
          />
        </div>
      </div>

      {/* Vue conversation */}
      <div
        className={`flex-1 flex flex-col h-full relative min-w-0 ${!selectedId ? 'hidden md:flex' : ''}`}
        aria-hidden={!selectedId}
      >
        <ChatView
          key={selectedId ?? 'none'}
          conversationId={selectedId}
          currentUserId={userId}
          entityType={entityType ?? null}
          otherUserName={otherUser.name}
          otherUserAvatarUrl={otherUser.avatarUrl}
          myLabel={myLabel}
          brandId={selected?.brand_id}
          showroomId={selected?.showroom_id}
          onBackToConversations={backToList}
        />
      </div>
    </div>
  );
}
