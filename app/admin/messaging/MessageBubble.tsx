'use client';

import type { Message } from '@/lib/supabase';

type Props = {
  message: Message;
  /** true si message.sender_id === currentUser.id (c'est mon message) */
  isMe: boolean;
  /** Nom de l'interlocuteur (affiché uniquement au-dessus des messages reçus) */
  otherUserName: string;
};

/**
 * isMe TRUE  → justify-end, bulle foncée, PAS de nom.
 * isMe FALSE → justify-start, bulle claire, AFFICHE otherUserName au-dessus.
 */
export function MessageBubble({ message, isMe, otherUserName }: Props) {
  return (
    <div className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
        {!isMe && (
          <p className="text-xs font-medium text-neutral-500 mb-0.5 ml-1">{otherUserName}</p>
        )}
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            isMe
              ? 'rounded-br-md bg-stone-800 text-white'
              : 'rounded-bl-md bg-gray-200 text-neutral-900'
          }`}
        >
          <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
          <p
            className={`text-[10px] mt-1 ${
              isMe ? 'text-stone-300' : 'text-neutral-500'
            }`}
          >
            {message.created_at
              ? new Date(message.created_at).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
