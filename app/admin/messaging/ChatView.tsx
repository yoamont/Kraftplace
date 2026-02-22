'use client';

import { useEffect, useRef } from 'react';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useMessages, type UseMessagesMode } from '@/lib/hooks/useMessages';
import type { Message } from '@/lib/supabase';
import { ChatInput } from './ChatInput';

type Props = {
  conversationId: string | null;
  candidatureId: string | null;
  /** ID utilisé pour le fetch (candidature_id ou conversation_id) */
  activeMessageId: string | null;
  messageMode: UseMessagesMode;
  currentUserId: string | null;
  entityType: 'brand' | 'showroom' | null;
  /** Nom de l'interlocuteur (boutique ou marque) */
  otherUserName: string;
  otherUserAvatarUrl: string | null;
  /** Nom de la marque ou boutique de l'utilisateur connecté (pour afficher "qui est qui") */
  myLabel?: string;
};

export function ChatView({
  conversationId,
  candidatureId: _candidatureId,
  activeMessageId,
  messageMode,
  currentUserId,
  entityType,
  otherUserName,
  otherUserAvatarUrl,
  myLabel = 'Vous',
}: Props) {
  const currentRole: 'brand' | 'boutique' | null =
    entityType === 'showroom' ? 'boutique' : entityType === 'brand' ? 'brand' : null;

  const { messages, loading, sending, sendMessage } = useMessages(
    activeMessageId,
    currentUserId,
    messageMode,
    conversationId
  );

  const handleSend = (content: string) => {
    if (currentRole) sendMessage(content, currentRole);
  };
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!loading) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [loading]);

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
      {/* HEADER */}
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

      {/* ZONE DES MESSAGES */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-neutral-500 text-sm">
            <p>Aucun message. Envoyez le premier.</p>
          </div>
        ) : (
          messages.map((m: Message) => {
            const timeStr = m.created_at
              ? new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false })
                  .format(new Date(m.created_at))
                  .replace(':', 'h')
              : '';

            const isSystemMessage =
              (m.message_type && m.message_type !== 'chat') ||
              ((m as Message & { type?: string }).type && (m as Message & { type?: string }).type?.startsWith('system_'));
            if (isSystemMessage) {
              const content = m.content ?? (m as Message & { metadata?: { label?: string } }).metadata?.label ?? 'Événement';
              return (
                <div key={m.id} className="flex w-full justify-center my-2">
                  <span className="bg-gray-100 text-gray-500 text-xs py-1 px-3 rounded-full text-center">
                    {content}
                  </span>
                </div>
              );
            }

            // Qui a envoyé : priorité à sender_id (fiable), fallback sender_role si présent
            const isMe =
              m.sender_id != null && currentUserId != null && m.sender_id === currentUserId;

            return (
              <div
                key={m.id}
                className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                  <span
                    className={`text-xs text-neutral-500 mb-1 ${isMe ? 'mr-1' : 'ml-1'}`}
                  >
                    {isMe ? myLabel : otherUserName}
                  </span>

                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      isMe
                        ? 'bg-stone-800 text-white rounded-br-none'
                        : 'bg-gray-100 text-neutral-900 rounded-bl-none'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{m.content ?? ''}</p>
                  </div>

                  <span
                    className={`text-[10px] text-neutral-400 mt-1 ${isMe ? 'mr-1' : 'ml-1'}`}
                  >
                    {timeStr}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ZONE DE SAISIE (Bloquée en bas) */}
      <div className="h-24 shrink-0 border-t bg-gray-50 p-4 w-full">
        <ChatInput
          onSend={handleSend}
          disabled={sending || !currentRole}
          placeholder="Écrire un message…"
        />
      </div>
    </div>
  );
}
