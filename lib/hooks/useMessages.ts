'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Message } from '@/lib/supabase';

/**
 * Historique + temps réel pour une conversation.
 * Marque les messages comme lus à l’ouverture.
 */
export type UseMessagesMode = 'conversation' | 'candidature';

export function useMessages(
  conversationOrCandidatureId: string | null,
  userId: string | null,
  mode: UseMessagesMode = 'conversation',
  /** En mode candidature : id de la conversation pour inclure aussi les messages liés à conversation_id (historique contrepartie). */
  conversationIdForFallback: string | null = null
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationOrCandidatureId && (mode !== 'candidature' || !conversationIdForFallback)) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const isCandidature = mode === 'candidature';
    // Colonnes minimales (base + candidature_id du script unifié) pour éviter 400
    let query = supabase
      .from('messages')
      .select('id, conversation_id, sender_id, content, is_read, created_at, candidature_id')
      .order('created_at', { ascending: true });
    if (isCandidature) {
      // Inclure messages par candidature_id OU par conversation_id (contrepartie peut avoir envoyé avec conversation_id)
      if (conversationIdForFallback) {
        query = query.or(
          `candidature_id.eq.${conversationOrCandidatureId},conversation_id.eq.${conversationIdForFallback}`
        );
      } else {
        query = query.eq('candidature_id', conversationOrCandidatureId);
      }
    } else {
      query = query.eq('conversation_id', conversationOrCandidatureId);
    }
    const { data, error: e } = await query;
    if (e) {
      setError(e.message);
      setMessages([]);
    } else {
      const list = (data as Message[]) ?? [];
      const byId = new Map<string, Message>();
      for (const m of list) {
        if (!byId.has(m.id)) byId.set(m.id, m);
      }
      setMessages(Array.from(byId.values()).sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? '')));
    }
    setLoading(false);
  }, [conversationOrCandidatureId, mode, conversationIdForFallback]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Realtime: nouveaux messages (candidature_id et/ou conversation_id si fallback)
  useEffect(() => {
    const isCandidature = mode === 'candidature';
    const filterCol = isCandidature ? 'candidature_id' : 'conversation_id';
    const filterVal = conversationOrCandidatureId;
    if (!filterVal) return;

    const addOrUpdate = (newRow: Message, isInsert: boolean) => {
      setMessages((prev) => {
        if (isInsert && prev.some((m) => m.id === newRow.id)) return prev;
        if (isInsert) return [...prev, newRow].sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''));
        return prev.map((m) => (m.id === newRow.id ? newRow : m));
      });
    };

    const channel = supabase
      .channel(`messages:${filterCol}:${filterVal}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `${filterCol}=eq.${filterVal}` },
        (payload) => addOrUpdate(payload.new as Message, true)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `${filterCol}=eq.${filterVal}` },
        (payload) => addOrUpdate(payload.new as Message, false)
      )
      .subscribe();

    let channelConv: ReturnType<typeof supabase.channel> | null = null;
    if (isCandidature && conversationIdForFallback) {
      channelConv = supabase
        .channel(`messages:conversation_id:${conversationIdForFallback}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationIdForFallback}` },
          (payload) => addOrUpdate(payload.new as Message, true)
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationIdForFallback}` },
          (payload) => addOrUpdate(payload.new as Message, false)
        )
        .subscribe();
    }

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      if (channelConv) supabase.removeChannel(channelConv);
      channelRef.current = null;
    };
  }, [conversationOrCandidatureId, mode, conversationIdForFallback]);

  // Marquer comme lu à l’ouverture de la conversation
  const markAsRead = useCallback(async () => {
    if (!userId) return;
    const isCandidature = mode === 'candidature';
    const base = supabase.from('messages').update({ is_read: true }).neq('sender_id', userId);
    if (isCandidature && conversationOrCandidatureId) {
      await base.eq('candidature_id', conversationOrCandidatureId);
      if (conversationIdForFallback) {
        await supabase.from('messages').update({ is_read: true }).neq('sender_id', userId).eq('conversation_id', conversationIdForFallback);
      }
    } else if (conversationOrCandidatureId) {
      await base.eq('conversation_id', conversationOrCandidatureId);
    }
    setMessages((prev) =>
      prev.map((m) => (m.sender_id !== userId ? { ...m, is_read: true } : m))
    );
  }, [conversationOrCandidatureId, userId, mode, conversationIdForFallback]);

  useEffect(() => {
    if (conversationOrCandidatureId && userId && messages.length >= 0) markAsRead();
  }, [conversationOrCandidatureId, userId, markAsRead]);

  const sendMessage = useCallback(
    async (content: string, senderRole: 'brand' | 'boutique') => {
      if (!conversationOrCandidatureId || !userId || !content.trim() || sending) return;
      if (senderRole !== 'brand' && senderRole !== 'boutique') return;
      setSending(true);
      setError(null);
      const isCandidature = mode === 'candidature';
      const payload = isCandidature
        ? { candidature_id: conversationOrCandidatureId, sender_id: userId, content: content.trim(), sender_role: senderRole, type: 'user', is_read: false }
        : { conversation_id: conversationOrCandidatureId, sender_id: userId, content: content.trim(), sender_role: senderRole, is_read: false };
      const { error: e } = await supabase.from('messages').insert(payload);
      if (e) setError(e.message);
      setSending(false);
    },
    [conversationOrCandidatureId, userId, sending, mode]
  );

  return {
    messages,
    loading,
    sending,
    error,
    sendMessage,
    markAsRead,
    refresh: fetchMessages,
  };
}
