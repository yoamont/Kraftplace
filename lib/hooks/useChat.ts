'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { UnifiedMessage } from '@/lib/supabase';

/**
 * Hook unique pour le fil de discussion : fetch + realtime par conversation_id.
 * Garantit la même source que la sidebar (conversation_id) → 0% désync.
 */
export function useChat(
  conversationId: string | null,
  userId: string | null,
  /** Pour enregistrer qui envoie (marque ou boutique) et afficher correctement */
  senderRole?: 'brand' | 'boutique'
) {
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: e } = await supabase
      .from('messages')
      .select('id, conversation_id, created_at, updated_at, type, sender_id, sender_role, content, metadata, is_read')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (e) {
      setError(e.message);
      setMessages([]);
    } else {
      setMessages((data as UnifiedMessage[]) ?? []);
      // Marquer comme lus les messages reçus (pas envoyés par moi) quand j’ouvre la conversation
      if (userId) {
        await supabase
          .from('messages')
          .update({ is_read: true, updated_at: new Date().toISOString() })
          .eq('conversation_id', conversationId)
          .eq('is_read', false)
          .neq('sender_id', userId);
      }
    }
    setLoading(false);
  }, [conversationId, userId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Rafraîchir le fil quand l'onglet redevient visible (au cas où le Realtime n'a pas livré le message côté boutique)
  useEffect(() => {
    if (!conversationId) return;
    const onVisible = () => fetchMessages();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [conversationId, fetchMessages]);

  // Rafraîchir périodiquement pour ne pas dépendre uniquement du Realtime (ex. message marque → boutique)
  useEffect(() => {
    if (!conversationId) return;
    const interval = setInterval(fetchMessages, 15000);
    return () => clearInterval(interval);
  }, [conversationId, fetchMessages]);

  // Realtime : un seul abonnement sur conversation_id
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:conversation:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const row = payload.new as UnifiedMessage;
          setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row].sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const row = payload.new as UnifiedMessage;
          setMessages((prev) => prev.map((m) => (m.id === row.id ? row : m)));
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId || !userId || !content.trim() || sending) return;
      setSending(true);
      setError(null);
      const payload: Record<string, unknown> = {
        conversation_id: conversationId,
        type: 'CHAT',
        sender_id: userId,
        content: content.trim(),
        is_read: false,
      };
      if (senderRole) payload.sender_role = senderRole;
      const { error: e } = await supabase.from('messages').insert(payload);
      if (e) setError(e.message);
      setSending(false);
    },
    [conversationId, userId, senderRole, sending]
  );

  const sendEvent = useCallback(
    async (type: UnifiedMessage['type'], metadata: Record<string, unknown>, content?: string | null) => {
      if (!conversationId || sending) return;
      setSending(true);
      setError(null);
      const payload: Record<string, unknown> = {
        conversation_id: conversationId,
        type,
        metadata: metadata ?? {},
        is_read: false,
      };
      if (userId) payload.sender_id = userId;
      if (senderRole) payload.sender_role = senderRole;
      if (content != null) payload.content = content;
      const { error: e } = await supabase.from('messages').insert(payload);
      if (e) setError(e.message);
      setSending(false);
    },
    [conversationId, userId, senderRole, sending]
  );

  const updateMessageMetadata = useCallback(
    async (messageId: string, metadataPatch: Record<string, unknown>) => {
      const { data: existing } = await supabase.from('messages').select('metadata').eq('id', messageId).single();
      if (!existing?.metadata) return;
      const current = (existing.metadata as Record<string, unknown>) ?? {};
      const next = { ...current, ...metadataPatch };
      await supabase.from('messages').update({ metadata: next, updated_at: new Date().toISOString() }).eq('id', messageId);
    },
    []
  );

  return {
    messages,
    loading,
    sending,
    error,
    sendMessage,
    sendEvent,
    updateMessageMetadata,
    refresh: fetchMessages,
  };
}
