'use client';

import { useMemo, useState } from 'react';
import { useAdminEntity } from '../context/AdminEntityContext';
import { usePlacements, type PlacementRow, type PlacementStatus } from '@/lib/hooks/usePlacements';
import { PartnershipDetailDrawer } from './PartnershipDetailDrawer';
import { ChevronRight, FileText, Search, Calendar } from 'lucide-react';

type StatusFilter = 'all' | 'pending' | 'accepted' | 'ended';

function StatusBadge({ status, isEnded }: { status: PlacementStatus; isEnded?: boolean }) {
  if (isEnded)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 bg-neutral-100/90 px-2.5 py-1 rounded-full">
        Terminé
      </span>
    );
  if (status === 'pending')
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50/90 px-2.5 py-1 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden /> En attente
      </span>
    );
  if (status === 'accepted')
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50/90 px-2.5 py-1 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden /> Accepté
      </span>
    );
  if (status === 'rejected')
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 bg-neutral-100/90 px-2.5 py-1 rounded-full">
        Refusé
      </span>
    );
  return <span className="text-xs font-light text-neutral-400">-</span>;
}

type PlacementGroup = {
  otherPartyId: number;
  otherPartyName: string;
  otherPartyAvatarUrl: string | null;
  rows: PlacementRow[];
};

function isRowEnded(row: PlacementRow): boolean {
  if (row.status === 'rejected') return true;
  if (row.status === 'accepted' && row.partnershipEndDate) {
    try {
      return new Date(row.partnershipEndDate) < new Date();
    } catch {
      return false;
    }
  }
  return false;
}

export default function PlacementsPage() {
  const { entityType, activeBrand, activeShowroom, loading: entityLoading } = useAdminEntity();
  const { placements, loading, error, refresh } = usePlacements(activeBrand, activeShowroom);
  const [detailRow, setDetailRow] = useState<PlacementRow | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [seasonYear, setSeasonYear] = useState<number | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  const isBrand = entityType === 'brand' && activeBrand;
  const isShowroom = entityType === 'showroom' && activeShowroom;

  const years = useMemo(() => {
    const set = new Set<number>();
    placements.forEach((r) => {
      if (r.partnershipStartDate) set.add(new Date(r.partnershipStartDate).getFullYear());
      if (r.partnershipEndDate) set.add(new Date(r.partnershipEndDate).getFullYear());
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [placements]);

  const filteredPlacements = useMemo(() => {
    let list = placements;
    if (statusFilter !== 'all') {
      list = list.filter((row) => {
        const ended = isRowEnded(row);
        if (statusFilter === 'pending') return row.status === 'pending';
        if (statusFilter === 'accepted') return row.status === 'accepted' && !ended;
        if (statusFilter === 'ended') return ended;
        return true;
      });
    }
    if (seasonYear !== '') {
      const y = Number(seasonYear);
      list = list.filter((row) => {
        const start = row.partnershipStartDate ? new Date(row.partnershipStartDate) : null;
        const end = row.partnershipEndDate ? new Date(row.partnershipEndDate) : null;
        if (!start && !end) return false;
        const startY = start?.getFullYear() ?? 0;
        const endY = end?.getFullYear() ?? 0;
        return (startY <= y && y <= endY) || startY === y || endY === y;
      });
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((row) => row.otherPartyName.toLowerCase().includes(q));
    }
    return list;
  }, [placements, statusFilter, seasonYear, searchQuery]);

  const groups = useMemo(() => {
    const byParty = new Map<number, PlacementGroup>();
    for (const row of filteredPlacements) {
      const existing = byParty.get(row.otherPartyId);
      if (existing) {
        existing.rows.push(row);
      } else {
        byParty.set(row.otherPartyId, {
          otherPartyId: row.otherPartyId,
          otherPartyName: row.otherPartyName,
          otherPartyAvatarUrl: row.otherPartyAvatarUrl,
          rows: [row],
        });
      }
    }
    return Array.from(byParty.values());
  }, [filteredPlacements]);

  if (entityLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <span className="text-sm font-light text-neutral-500">Chargement…</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto min-h-[50vh] bg-[#FBFBFD]">
      <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">Partenariats</h1>
      <p className="mt-0.5 text-sm font-light text-neutral-500 mb-6">
        {isBrand && 'Mises en relation et candidatures par boutique. Filtrez par statut, saison ou nom.'}
        {isShowroom && 'Candidatures et sessions de vente par marque. Filtrez par statut, saison ou nom.'}
        {!isBrand && !isShowroom && 'Partenariats et demandes.'}
      </p>

      {error && (
        <div className="rounded-xl bg-red-50/90 border border-red-100 px-4 py-3 text-sm text-red-800 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="text-sm font-light text-neutral-500">Chargement des partenariats…</span>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="inline-flex rounded-xl p-0.5 bg-neutral-100 border border-black/[0.06]">
              {(['all', 'pending', 'accepted', 'ended'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === key
                      ? 'bg-white text-neutral-900 shadow-sm'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {key === 'all' ? 'Tous' : key === 'pending' ? 'En attente' : key === 'accepted' ? 'Acceptés' : 'Terminés'}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-black/[0.06] bg-white px-3 py-2 w-full sm:w-auto min-w-0">
              <Calendar className="h-4 w-4 text-neutral-400 shrink-0" strokeWidth={1.5} />
              <select
                value={seasonYear}
                onChange={(e) => setSeasonYear(e.target.value === '' ? '' : Number(e.target.value))}
                className="text-sm font-medium text-neutral-900 bg-transparent border-0 focus:ring-0 focus:outline-none cursor-pointer min-w-[6rem]"
              >
                <option value="">Saison</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" strokeWidth={1.5} />
              <input
                type="search"
                placeholder={isBrand ? 'Rechercher une boutique…' : 'Rechercher une marque…'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-black/[0.06] bg-white text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
              />
            </div>
          </div>

          {groups.length === 0 ? (
            <div className="rounded-[12px] border border-black/[0.06] bg-white p-8 text-center">
              <p className="font-medium text-neutral-900 mb-1">Aucun partenariat</p>
              <p className="text-sm font-light text-neutral-500">
                {placements.length === 0
                  ? isShowroom
                    ? 'Les candidatures des marques et vos sessions apparaîtront ici.'
                    : 'Les candidatures et échanges apparaîtront ici.'
                  : 'Aucun résultat pour ces filtres.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => (
                <div
                  key={group.otherPartyId}
                  className="rounded-[12px] border border-black/[0.06] bg-white overflow-hidden"
                >
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-black/[0.06]">
                    {group.otherPartyAvatarUrl?.trim() ? (
                      <img
                        src={group.otherPartyAvatarUrl.trim()}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <span className="w-9 h-9 rounded-full bg-neutral-100 shrink-0 flex items-center justify-center text-neutral-500 text-sm font-medium">
                        {group.otherPartyName.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="font-medium text-neutral-900">{group.otherPartyName}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-black/[0.06]">
                          <th className="py-2.5 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Annonce
                          </th>
                          <th className="py-2.5 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Période de vente
                          </th>
                          <th className="py-2.5 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                            Statut
                          </th>
                          <th className="py-2.5 px-4 text-xs font-medium text-neutral-500 uppercase tracking-wider w-24">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((row) => {
                          const ended = isRowEnded(row);
                          return (
                            <tr
                              key={row.conversationId}
                              className="border-b border-black/[0.06] last:border-b-0 hover:bg-neutral-50/50 transition-colors"
                            >
                              <td className="py-2.5 px-4">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-neutral-400 shrink-0" strokeWidth={1.5} />
                                  <span className="text-sm font-medium text-neutral-900">
                                    {row.listingTitle?.trim() || '-'}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2.5 px-4 text-sm font-light text-neutral-700 whitespace-nowrap">
                                {row.sessionDateLabel}
                              </td>
                              <td className="py-2.5 px-4">
                                <StatusBadge status={row.status} isEnded={ended} />
                              </td>
                              <td className="py-2.5 px-4">
                                <button
                                  type="button"
                                  onClick={() => setDetailRow(row)}
                                  className="inline-flex items-center gap-1 text-sm font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
                                >
                                  Voir le détail
                                  <ChevronRight className="h-4 w-4 text-neutral-400" strokeWidth={1.5} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <PartnershipDetailDrawer
        open={!!detailRow}
        onClose={() => { setDetailRow(null); refresh(); }}
        conversationId={detailRow?.conversationId ?? null}
        otherPartyName={detailRow?.otherPartyName ?? ''}
        otherPartyAvatarUrl={detailRow?.otherPartyAvatarUrl ?? null}
        status={detailRow?.status ?? null}
      />
    </div>
  );
}
