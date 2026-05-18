'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { UnifiedMessage } from '@/lib/supabase';

export function useChat(
  conversationId: string | null,
  userId: string | null,
  senderRole?: 'brand' | 'boutique'
) {
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const optimisticIdsRef = useRef<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setError(null);
    const { data, error: e } = await supabase
      .from('messages')
      .select('id, conversation_id, created_at, updated_at, type, sender_id, sender_role, content, metadata, is_read')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (e) {
      setError(e.message);
      setLoading(false);
      return;
    }

    const serverMessages = (data as UnifiedMessage[]) ?? [];

    setMessages((prev) => {
      // Keep optimistic messages not yet confirmed by server
      const serverIds = new Set(serverMessages.map((m) => m.id));
      const pending = prev.filter(
        (m) => optimisticIdsRef.current.has(m.id) && !serverIds.has(m.id)
      );
      return [...serverMessages, ...pending].sort(
        (a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? '')
      );
    });

    // Mark received messages as read
    if (userId) {
      supabase
        .from('messages')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('is_read', false)
        .neq('sender_id', userId)
        .then(() => {});
    }

    setLoading(false);
  }, [conversationId, userId]);

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    fetchMessages();
  }, [fetchMessages]);

  // Refetch on tab focus
  useEffect(() => {
    if (!conversationId) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchMessages();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [conversationId, fetchMessages]);

  // Polling fallback every 5s (in case realtime is not enabled on the table)
  useEffect(() => {
    if (!conversationId) return;
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [conversationId, fetchMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat:${conversationId}:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const row = payload.new as UnifiedMessage;
          setMessages((prev) => {
            // If we have an optimistic version of this message, replace it
            const tempIdx = prev.findIndex(
              (m) =>
                optimisticIdsRef.current.has(m.id) &&
                m.sender_id === row.sender_id &&
                m.content === row.content
            );
            if (tempIdx !== -1) {
              optimisticIdsRef.current.delete(prev[tempIdx].id);
              const next = [...prev];
              next[tempIdx] = row;
              return next;
            }
            // Otherwise append if not already present
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row].sort(
              (a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? '')
            );
          });
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

      // Optimistic: show message immediately
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const optimistic: UnifiedMessage = {
        id: tempId,
        conversation_id: conversationId,
        type: 'CHAT',
        sender_id: userId,
        sender_role: senderRole ?? null,
        content: content.trim(),
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {},
      };
      optimisticIdsRef.current.add(tempId);
      setMessages((prev) => [...prev, optimistic]);

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

      const { data, error: e } = await supabase
        .from('messages')
        .insert(payload)
        .select('id, conversation_id, created_at, updated_at, type, sender_id, sender_role, content, metadata, is_read')
        .single();

      if (e) {
        // Remove optimistic on error
        optimisticIdsRef.current.delete(tempId);
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setError(e.message);
      } else if (data) {
        // Replace optimistic with real message (realtime may have already done this)
        optimisticIdsRef.current.delete(tempId);
        setMessages((prev) => {
          if (prev.some((m) => m.id === (data as UnifiedMessage).id)) {
            return prev.filter((m) => m.id !== tempId);
          }
          return prev.map((m) => (m.id === tempId ? (data as UnifiedMessage) : m));
        });
      }

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
      const { data: existing } = await supabase
        .from('messages')
        .select('metadata')
        .eq('id', messageId)
        .single();
      if (!existing?.metadata) return;
      const current = (existing.metadata as Record<string, unknown>) ?? {};
      const next = { ...current, ...metadataPatch };
      await supabase
        .from('messages')
        .update({ metadata: next, updated_at: new Date().toISOString() })
        .eq('id', messageId);
    },
    []
  );

  return { messages, loading, sending, error, sendMessage, sendEvent, updateMessageMetadata, refresh: fetchMessages };
}
