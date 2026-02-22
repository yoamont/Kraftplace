'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Brand, Showroom } from '@/lib/supabase';

/**
 * Nombre total de messages non lus pour l’entité courante (marque ou boutique).
 * Utilisé pour la bulle sur le lien « Messagerie » dans le menu.
 */
export function useUnreadMessagesCount(
  userId: string | null,
  activeBrand: Brand | null,
  activeShowroom: Showroom | null
) {
  const [count, setCount] = useState(0);
  const [convIds, setConvIds] = useState<string[]>([]);

  const fetchCount = useCallback(async () => {
    if (!userId) {
      setCount(0);
      setConvIds([]);
      return;
    }
    if (!activeBrand && !activeShowroom) {
      setCount(0);
      setConvIds([]);
      return;
    }

    let convQuery = supabase.from('conversations').select('id');
    if (activeBrand) convQuery = convQuery.eq('brand_id', activeBrand.id);
    else convQuery = convQuery.eq('showroom_id', activeShowroom!.id);
    const { data: convRows } = await convQuery;
    const ids = ((convRows as { id: string }[]) ?? []).map((r) => r.id);
    setConvIds((prev) => (prev.length !== ids.length || ids.some((id, i) => prev[i] !== id) ? ids : prev));
    if (ids.length === 0) {
      setCount(0);
      return;
    }

    // Messages non lus = is_read = false et pas envoyés par moi
    const { data: rows, error } = await supabase
      .from('messages')
      .select('id')
      .in('conversation_id', ids)
      .eq('is_read', false)
      .not('sender_id', 'eq', userId);

    if (error) {
      setCount(0);
      return;
    }
    setCount(Array.isArray(rows) ? rows.length : 0);
  }, [userId, activeBrand?.id, activeShowroom?.id]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  useEffect(() => {
    const onFocus = () => fetchCount();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchCount]);

  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(fetchCount, 12000);
    return () => clearInterval(interval);
  }, [userId, fetchCount]);

  useEffect(() => {
    if (!userId || convIds.length === 0) return;
    const channels = convIds.map((cid) =>
      supabase
        .channel(`unread:${cid}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${cid}` }, fetchCount)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${cid}` }, fetchCount)
        .subscribe()
    );
    return () => channels.forEach((ch) => supabase.removeChannel(ch));
  }, [userId, convIds, fetchCount]);

  return { unreadCount: count, refresh: fetchCount };
}
