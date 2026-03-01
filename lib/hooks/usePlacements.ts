'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Brand, Showroom } from '@/lib/supabase';
import { formatSessionDate } from '@/lib/utils/formatSessionDate';

export type PlacementStatus = 'pending' | 'accepted' | 'rejected' | null;

export type PlacementRow = {
  conversationId: string;
  listingId: number | null;
  listingTitle: string | null;
  sessionDateLabel: string;
  /** Pour tri et filtre date (ISO) */
  partnershipStartDate: string | null;
  partnershipEndDate: string | null;
  /** Date d'acceptation candidature (ISO) pour tri secondaire */
  acceptanceDate: string | null;
  otherPartyId: number;
  otherPartyName: string;
  otherPartyAvatarUrl: string | null;
  status: PlacementStatus;
  updatedAt: string | null;
};

type ConvRow = {
  id: string;
  brand_id: number;
  showroom_id: number;
  listing_id: number | null;
  updated_at: string | null;
};

type ListingRow = {
  id: number;
  title: string | null;
  partnership_start_date: string | null;
  partnership_end_date: string | null;
};

type CandidatureRow = {
  conversation_id: string;
  id: string;
  type: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

/**
 * Liste des partenariats (conversations) pour la marque ou la boutique courante.
 * Inclut date de session, autre partie, statut candidature.
 */
export function usePlacements(
  activeBrand: Brand | null,
  activeShowroom: Showroom | null
) {
  const [rows, setRows] = useState<PlacementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlacements = useCallback(async () => {
    const brandId = activeBrand?.id;
    const showroomId = activeShowroom?.id;
    if (!brandId && !showroomId) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('conversations')
        .select('id, brand_id, showroom_id, listing_id, updated_at')
        .order('updated_at', { ascending: false });

      if (brandId) query = query.eq('brand_id', brandId);
      else if (showroomId) query = query.eq('showroom_id', showroomId);

      const { data: convs, error: eConv } = await query;
      if (eConv) {
        setError(eConv.message);
        setRows([]);
        setLoading(false);
        return;
      }

      const list = (convs as ConvRow[]) ?? [];
      if (list.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      const convIds = list.map((c) => c.id);
      const listingIds = [...new Set(list.map((c) => c.listing_id).filter((id): id is number => id != null))];

      let listings: ListingRow[] = [];
      if (listingIds.length > 0) {
        const { data: listData } = await supabase
          .from('listings')
          .select('id, title, partnership_start_date, partnership_end_date')
          .in('id', listingIds);
        listings = (listData as ListingRow[]) ?? [];
      }
      const listingById = new Map(listings.map((l) => [l.id, l]));

      const brandIds = [...new Set(list.map((c) => c.brand_id))];
      const showroomIds = [...new Set(list.map((c) => c.showroom_id))];

      const [{ data: brandsData }, { data: showroomsData }] = await Promise.all([
        supabase.from('brands').select('id, brand_name, avatar_url').in('id', brandIds),
        supabase.from('showrooms').select('id, name, avatar_url').in('id', showroomIds),
      ]);

      const brandsMap = new Map(
        (brandsData as { id: number; brand_name: string | null; avatar_url: string | null }[] | null)?.map((b) => [b.id, b]) ?? []
      );
      const showroomsMap = new Map(
        (showroomsData as { id: number; name: string | null; avatar_url: string | null }[] | null)?.map((s) => [s.id, s]) ?? []
      );

      const { data: candRows } = await supabase
        .from('messages')
        .select('id, conversation_id, type, created_at, metadata')
        .in('conversation_id', convIds)
        .in('type', ['CANDIDATURE_SENT', 'CANDIDATURE_ACCEPTED', 'CANDIDATURE_REFUSED'])
        .order('created_at', { ascending: true });

      const candList = (candRows as CandidatureRow[]) ?? [];
      const byConv = new Map<string, CandidatureRow[]>();
      for (const m of candList) {
        if (!byConv.has(m.conversation_id)) byConv.set(m.conversation_id, []);
        byConv.get(m.conversation_id)!.push(m);
      }

      const statusByConv: Record<string, PlacementStatus> = {};
      const acceptanceDateByConv: Record<string, string | null> = {};
      for (const cid of convIds) {
        const ms = byConv.get(cid) ?? [];
        const sentIdx = ms.findIndex((m) => m.type === 'CANDIDATURE_SENT');
        if (sentIdx === -1) {
          statusByConv[cid] = null;
          acceptanceDateByConv[cid] = null;
          continue;
        }
        const afterSent = ms.slice(sentIdx + 1);
        const acceptedMsg = afterSent.find((m) => m.type === 'CANDIDATURE_ACCEPTED');
        const acceptedAfter = !!acceptedMsg;
        const refusedAfter = afterSent.some((m) => m.type === 'CANDIDATURE_REFUSED');
        const lastSent = ms[sentIdx];
        const meta = (lastSent.metadata ?? {}) as { status?: string };
        if (acceptedAfter) {
          statusByConv[cid] = 'accepted';
          acceptanceDateByConv[cid] = acceptedMsg?.created_at ?? null;
        } else if (refusedAfter || meta.status === 'rejected' || meta.status === 'cancelled') {
          statusByConv[cid] = 'rejected';
          acceptanceDateByConv[cid] = null;
        } else {
          statusByConv[cid] = 'pending';
          acceptanceDateByConv[cid] = null;
        }
      }

      const isBrand = !!brandId;
      const result: PlacementRow[] = list.map((c) => {
        const listing = c.listing_id != null ? listingById.get(c.listing_id) : null;
        const sessionDateLabel = listing
          ? formatSessionDate(listing.partnership_start_date, listing.partnership_end_date)
          : '-';
        const listingTitle = listing?.title ?? null;
        const partnershipStartDate = listing?.partnership_start_date ?? null;
        const partnershipEndDate = listing?.partnership_end_date ?? null;
        const brand = brandsMap.get(c.brand_id);
        const showroom = showroomsMap.get(c.showroom_id);
        const otherPartyName = isBrand
          ? (showroom?.name ?? 'Boutique')
          : (brand?.brand_name ?? 'Marque');
        const otherPartyAvatarUrl = isBrand ? showroom?.avatar_url ?? null : brand?.avatar_url ?? null;
        const otherPartyId = isBrand ? c.showroom_id : c.brand_id;

        return {
          conversationId: c.id,
          listingId: c.listing_id,
          listingTitle,
          sessionDateLabel,
          partnershipStartDate,
          partnershipEndDate,
          acceptanceDate: acceptanceDateByConv[c.id] ?? null,
          otherPartyId,
          otherPartyName,
          otherPartyAvatarUrl,
          status: statusByConv[c.id] ?? null,
          updatedAt: c.updated_at,
        };
      });

      result.sort((a, b) => {
        const aStart = a.partnershipStartDate ?? '';
        const bStart = b.partnershipStartDate ?? '';
        const dateCmp = aStart.localeCompare(bStart);
        if (dateCmp !== 0) return dateCmp;
        const aAcc = a.acceptanceDate ?? '';
        const bAcc = b.acceptanceDate ?? '';
        return bAcc.localeCompare(aAcc);
      });

      setRows(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [activeBrand?.id, activeShowroom?.id]);

  useEffect(() => {
    fetchPlacements();
  }, [fetchPlacements]);

  return { placements: rows, loading, error, refresh: fetchPlacements };
}
