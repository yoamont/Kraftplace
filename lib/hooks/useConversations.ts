'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Conversation, Brand, Showroom } from '@/lib/supabase';

export type ConversationWithDetails = Conversation & {
  /** Candidature utilisée pour charger les messages (fil par candidature) */
  candidatureId: string | null;
  lastMessage: { content: string; created_at: string | null } | null;
  unreadCount: number;
  /** Interlocuteur : nom et avatar (jointure brands / showrooms, pas de table users) */
  otherParty: { name: string; avatar_url: string | null; id: number };
  mySide: 'brand' | 'showroom';
};

type Row = Conversation & {
  brands: { brand_name: string | null; avatar_url: string | null } | null;
  showrooms: { name: string | null; avatar_url: string | null } | null;
};

/**
 * Liste des conversations où l'utilisateur connecté est participant (propriétaire du brand ou du showroom).
 * Un seul SELECT sur conversations avec jointures brands + showrooms pour le nom/avatar de l'interlocuteur.
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
        .from('conversations')
        .select(
          'id, brand_id, showroom_id, updated_at, brands(brand_name, avatar_url), showrooms(name, avatar_url)'
        )
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

      const list = (rows as unknown as Row[]) ?? [];
      if (list.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Résoudre la dernière candidature par (brand_id, showroom_id) pour charger les messages par candidature_id
      type CandRow = { id: string; brand_id: number; showroom_id: number; created_at: string | null };
      let candRows: CandRow[] = [];
      if (activeBrand) {
        const showroomIds = list.map((c) => c.showroom_id);
        const { data: cands } = await supabase
          .from('candidatures')
          .select('id, brand_id, showroom_id, created_at')
          .eq('brand_id', activeBrand.id)
          .in('showroom_id', showroomIds)
          .order('created_at', { ascending: false });
        candRows = (cands as CandRow[]) ?? [];
      } else if (activeShowroom) {
        const brandIds = list.map((c) => c.brand_id);
        const { data: cands } = await supabase
          .from('candidatures')
          .select('id, brand_id, showroom_id, created_at')
          .eq('showroom_id', activeShowroom.id)
          .in('brand_id', brandIds)
          .order('created_at', { ascending: false });
        candRows = (cands as CandRow[]) ?? [];
      }
      const pairToCandidatureId = new Map<string, string>();
      for (const cand of candRows) {
        const key = `${cand.brand_id}-${cand.showroom_id}`;
        if (!pairToCandidatureId.has(key)) pairToCandidatureId.set(key, cand.id);
      }

      const candidatureIds = [...pairToCandidatureId.values()];
      const [allMessagesRes, unreadRes] = await Promise.all([
        candidatureIds.length > 0
          ? supabase
              .from('messages')
              .select('candidature_id, content, created_at')
              .in('candidature_id', candidatureIds)
              .order('created_at', { ascending: false })
          : { data: [] as { candidature_id: string; content: string | null; created_at: string | null }[] },
        candidatureIds.length > 0 && userId
          ? supabase
              .from('messages')
              .select('candidature_id')
              .in('candidature_id', candidatureIds)
              .eq('is_read', false)
              .neq('sender_id', userId)
          : { data: [] as { candidature_id: string }[] },
      ]);

      const lastByCandidatureId: Record<string, { content: string; created_at: string | null }> = {};
      for (const m of allMessagesRes.data ?? []) {
        const cid = (m as { candidature_id: string }).candidature_id;
        if (cid && !lastByCandidatureId[cid]) {
          const content = (m as { content: string | null }).content;
          lastByCandidatureId[cid] = {
            content: content ?? '',
            created_at: (m as { created_at: string | null }).created_at,
          };
        }
      }
      const unreadByCandidatureId: Record<string, number> = {};
      for (const r of unreadRes.data ?? []) {
        const cid = (r as { candidature_id: string }).candidature_id;
        if (cid) unreadByCandidatureId[cid] = (unreadByCandidatureId[cid] ?? 0) + 1;
      }

      const mySide: 'brand' | 'showroom' = activeBrand ? 'brand' : 'showroom';
      const withDetails: ConversationWithDetails[] = list.map((c) => {
        const candidatureId = pairToCandidatureId.get(`${c.brand_id}-${c.showroom_id}`) ?? null;
        const otherParty =
          mySide === 'brand'
            ? (c.showrooms && { name: c.showrooms.name ?? 'Boutique', avatar_url: c.showrooms.avatar_url, id: c.showroom_id })
            : (c.brands && { name: c.brands.brand_name ?? 'Créateur', avatar_url: c.brands.avatar_url, id: c.brand_id });
        return {
          ...c,
          candidatureId,
          lastMessage: candidatureId ? lastByCandidatureId[candidatureId] ?? null : null,
          unreadCount: candidatureId ? unreadByCandidatureId[candidatureId] ?? 0 : 0,
          otherParty: otherParty ?? { name: mySide === 'brand' ? 'Boutique' : 'Créateur', avatar_url: null, id: mySide === 'brand' ? c.showroom_id : c.brand_id },
          mySide,
        };
      });

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

  return { conversations, loading, error, refresh: fetchConversations };
}
