'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Brand, Showroom } from '@/lib/supabase';

/** Une conversation avec dernier message (vue conversations_with_last_message). */
export type ConversationWithDetails = {
  id: string;
  brand_id: number;
  showroom_id: number;
  updated_at: string | null;
  otherParty: { name: string; avatar_url: string | null; id: number };
  lastMessage: { content: string; created_at: string | null; type?: string } | null;
  unreadCount: number;
  mySide: 'brand' | 'showroom';
};

type ViewRow = {
  id: string;
  brand_id: number;
  showroom_id: number;
  updated_at: string | null;
  brand_name: string | null;
  brand_avatar_url: string | null;
  showroom_name: string | null;
  showroom_avatar_url: string | null;
  last_message_id: string | null;
  last_message_type: string | null;
  last_message_content: string | null;
  last_message_at: string | null;
  last_message_metadata: Record<string, unknown> | null;
};

function lastMessageLabel(type: string | null, content: string | null): string {
  if (content?.trim()) return content;
  switch (type) {
    case 'DEAL_SENT':
      return 'Offre envoyée';
    case 'DEAL_ACCEPTED':
      return 'Offre acceptée';
    case 'DEAL_DECLINED':
      return 'Offre refusée';
    case 'CANDIDATURE_SENT':
      return 'Candidature envoyée';
    case 'OFFER_NEGOTIATED':
      return 'Proposition mise à jour';
    case 'CANDIDATURE_ACCEPTED':
      return 'Candidature acceptée';
    case 'CANDIDATURE_REFUSED':
      return 'Candidature refusée';
    case 'CONTRAT':
      return 'Contrat';
    case 'PAYMENT_REQUEST':
      return 'Demande de paiement';
    case 'DOCUMENT':
      return 'Document partagé';
    default:
      return 'Aucun message';
  }
}

/**
 * Sidebar : lit la vue conversations_with_last_message (même source que le chat → 0% désync).
 */
export function useConversations(
  userId: string | null,
  activeBrand: Brand | null,
  activeShowroom: Showroom | null
) {
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!userId) {
      setConversations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('conversations_with_last_message')
        .select('*')
        .order('updated_at', { ascending: false });

      if (activeBrand) {
        query = query.eq('brand_id', activeBrand.id);
      } else if (activeShowroom) {
        query = query.eq('showroom_id', activeShowroom.id);
      } else {
        setConversations([]);
        setLoading(false);
        return;
      }

      const { data: rows, error: e } = await query;
      if (e) {
        setError(e.message);
        setConversations([]);
        setLoading(false);
        return;
      }

      const list = (rows as ViewRow[]) ?? [];
      const convIds = list.map((r) => r.id);
      let unreadByConv: Record<string, number> = {};
      if (convIds.length > 0) {
        const { data: unreadRows } = await supabase
          .from('messages')
          .select('conversation_id')
          .in('conversation_id', convIds)
          .eq('is_read', false)
          .not('sender_id', 'eq', userId);
        const rows = (unreadRows as { conversation_id: string }[]) ?? [];
        rows.forEach((r) => {
          unreadByConv[r.conversation_id] = (unreadByConv[r.conversation_id] ?? 0) + 1;
        });
      }
      const mySide: 'brand' | 'showroom' = activeBrand ? 'brand' : 'showroom';
      const withDetails: ConversationWithDetails[] = list.map((row) => ({
        id: row.id,
        brand_id: row.brand_id,
        showroom_id: row.showroom_id,
        updated_at: row.updated_at,
        otherParty:
          mySide === 'brand'
            ? { name: row.showroom_name ?? 'Boutique', avatar_url: row.showroom_avatar_url, id: row.showroom_id }
            : { name: row.brand_name ?? 'Marque', avatar_url: row.brand_avatar_url, id: row.brand_id },
        lastMessage:
          row.last_message_id != null
            ? {
                content: lastMessageLabel(row.last_message_type, row.last_message_content),
                created_at: row.last_message_at,
                type: row.last_message_type ?? undefined,
              }
            : null,
        unreadCount: unreadByConv[row.id] ?? 0,
        mySide,
      }));

      setConversations(withDetails);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [userId, activeBrand?.id, activeShowroom?.id]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    const onVisible = () => fetchConversations();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchConversations]);

  return { conversations, loading, error, refresh: fetchConversations };
}
