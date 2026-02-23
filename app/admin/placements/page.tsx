'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAdminEntity } from '../context/AdminEntityContext';
import { Loader2, MessageSquare, Package, Store, Pencil, X, Send, Calendar, Filter } from 'lucide-react';
import type { Placement, Product, Showroom, Candidature, ShowroomCommissionOption } from '@/lib/supabase';
import { getOrCreateConversationId } from '@/lib/conversations';
import { getStatusDisplayLabel, getInitiatorBadgeLabel } from '@/lib/placements';
import { CandidatureDetailModal } from '../components/CandidatureDetailModal';

type PlacementWithDetails = Placement & { product?: Product; showroom?: Showroom };
type CandidatureWithDetails = Candidature & { showroom?: Showroom; option?: ShowroomCommissionOption };

const candidatureStatusLabel: Record<string, string> = {
  pending: 'En attente',
  accepted: 'Acceptée',
  declined: 'Refusée',
  cancelled: 'Annulée',
  expired: 'Expirée',
};

function optionSummary(opt: ShowroomCommissionOption | null): string {
  if (!opt) return '—';
  const parts: string[] = [];
  if (opt.rent != null && opt.rent > 0) {
    const period = opt.rent_period === 'week' ? '/sem.' : opt.rent_period === 'one_off' ? ' unique' : '/mois';
    parts.push(`${opt.rent}€${period}`);
  }
  if (opt.commission_percent != null) parts.push(`${opt.commission_percent} %`);
  if (opt.description?.trim()) parts.push(opt.description);
  return parts.join(' · ') || 'Option';
}

export default function PlacementsListPage() {
  const router = useRouter();
  const { entityType, activeBrand } = useAdminEntity();
  const [messagingNavigating, setMessagingNavigating] = useState(false);
  const [placements, setPlacements] = useState<PlacementWithDetails[]>([]);
  const [candidatures, setCandidatures] = useState<CandidatureWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [editCandidature, setEditCandidature] = useState<CandidatureWithDetails | null>(null);
  const [editOptions, setEditOptions] = useState<ShowroomCommissionOption[]>([]);
  const [editOptionId, setEditOptionId] = useState<number | null>(null);
  const [editIsNegotiation, setEditIsNegotiation] = useState(false);
  const [editNegotiationMessage, setEditNegotiationMessage] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [editPartnershipStart, setEditPartnershipStart] = useState('');
  const [editPartnershipEnd, setEditPartnershipEnd] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [detailCandidature, setDetailCandidature] = useState<CandidatureWithDetails | null>(null);
  const [lastMessageByCandidatureId, setLastMessageByCandidatureId] = useState<Record<string, { content: string | null; created_at: string | null }>>({});
  // Filtres (côté marque)
  const [filterPeriod, setFilterPeriod] = useState<'7' | '30' | '90' | 'all' | 'custom'>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterShowroomIds, setFilterShowroomIds] = useState<number[]>([]);

  const handleGoToMessaging = async (brandId: number, showroomId: number) => {
    setMessagingNavigating(true);
    try {
      const conversationId = await getOrCreateConversationId(brandId, showroomId);
      if (conversationId) router.push(`/messages?conversationId=${conversationId}`);
    } finally {
      setMessagingNavigating(false);
    }
  };

  useEffect(() => {
    if (entityType !== 'brand' || !activeBrand) {
      setLoading(false);
      return;
    }
    (async () => {
      const [placementsResult, candidaturesResult] = await Promise.all([
        (async () => {
          const { data: productsData } = await supabase.from('products').select('id').eq('brand_id', activeBrand.id);
          const products = (productsData as { id: number }[]) ?? [];
          if (products.length === 0) return { list: [] as Placement[], showroomMap: {} as Record<number, Showroom>, productMap: {} as Record<number, Product> };
          const productIds = products.map((p) => p.id);
          const { data: placementsData } = await supabase.from('placements').select('*').in('product_id', productIds).order('created_at', { ascending: false });
          const list = (placementsData as Placement[]) ?? [];
          if (list.length === 0) return { list, showroomMap: {} as Record<number, Showroom>, productMap: {} as Record<number, Product> };
          const { data: productsFull } = await supabase.from('products').select('id, product_name, image_url').in('id', productIds);
          const showroomIds = [...new Set(list.map((p) => p.showroom_id))];
          const { data: showroomsData } = await supabase.from('showrooms').select('id, name, city, avatar_url').in('id', showroomIds);
          const productMap = Object.fromEntries(((productsFull as Product[]) ?? []).map((p) => [p.id, p]));
          const showroomMap = Object.fromEntries(((showroomsData as Showroom[]) ?? []).map((s) => [s.id, s]));
          return { list, showroomMap, productMap };
        })(),
        (async () => {
          await supabase.rpc('expire_pending_candidatures');
          const { data: list } = await supabase.from('candidatures').select('*').eq('brand_id', activeBrand.id).order('created_at', { ascending: false });
          const rows = (list as Candidature[]) ?? [];
          if (rows.length === 0) return [] as CandidatureWithDetails[];
          const showroomIds = [...new Set(rows.map((c) => c.showroom_id))];
          const optionIds = rows.map((c) => c.showroom_commission_option_id).filter((id): id is number => id != null);
          const { data: showroomsData } = await supabase.from('showrooms').select('id, name, city, avatar_url').in('id', showroomIds);
          const showroomMap = Object.fromEntries(((showroomsData as Showroom[]) ?? []).map((s) => [s.id, s]));
          let optionMap: Record<number, ShowroomCommissionOption> = {};
          if (optionIds.length > 0) {
            const { data: optsData } = await supabase.from('showroom_commission_options').select('*').in('id', optionIds);
            optionMap = Object.fromEntries(((optsData as ShowroomCommissionOption[]) ?? []).map((o) => [o.id, o]));
          }
          return rows.map((c) => ({
            ...c,
            showroom: showroomMap[c.showroom_id],
            option: c.showroom_commission_option_id != null ? optionMap[c.showroom_commission_option_id] : undefined,
          }));
        })(),
      ]);

      const { list: placementList, showroomMap: sm, productMap: pm } = placementsResult;
      const placementsWithDetails = placementList.map((p) => ({
        ...p,
        product: pm[p.product_id],
        showroom: sm[p.showroom_id],
      }));
      setPlacements(placementsWithDetails);
      setCandidatures(candidaturesResult);

      let lastByCandidature: Record<string, { content: string | null; created_at: string | null }> = {};
      if (candidaturesResult.length > 0) {
        const uniquePairs = [...new Set(candidaturesResult.map((c) => `${c.brand_id}-${c.showroom_id}`))];
        const resolvedConvIds = await Promise.all(
          uniquePairs.map((key) => {
            const [bid, sid] = key.split('-').map(Number);
            return getOrCreateConversationId(bid, sid);
          })
        );
        const pairToConvId = new Map<string, string>();
        uniquePairs.forEach((key, i) => {
          const id = resolvedConvIds[i];
          if (id) pairToConvId.set(key, id);
        });
        const convIdsFiltered = resolvedConvIds.filter((id): id is string => id != null);
        if (convIdsFiltered.length > 0) {
          const { data: msgRows } = await supabase
            .from('messages')
            .select('id, conversation_id, content, created_at')
            .in('conversation_id', convIdsFiltered)
            .order('created_at', { ascending: false });
          const msgs = (msgRows as { id: string; conversation_id: string; content: string | null; created_at: string | null }[]) ?? [];
          const lastByConvId: Record<string, { content: string | null; created_at: string | null }> = {};
          msgs.forEach((m) => {
            if (!lastByConvId[m.conversation_id]) lastByConvId[m.conversation_id] = { content: m.content, created_at: m.created_at };
          });
          candidaturesResult.forEach((c) => {
            const convId = pairToConvId.get(`${c.brand_id}-${c.showroom_id}`);
            if (convId && lastByConvId[convId]) lastByCandidature[c.id] = lastByConvId[convId];
          });
        }
      }
      setLastMessageByCandidatureId(lastByCandidature);
      setLoading(false);
    })();
  }, [entityType, activeBrand?.id]);

  const now = Date.now();
  const periodMs = filterPeriod === 'all' || filterPeriod === 'custom' ? 0 : parseInt(filterPeriod, 10) * 24 * 60 * 60 * 1000;
  const inPeriod = (createdAt: string | null) => {
    if (!createdAt) return true;
    const t = new Date(createdAt).getTime();
    if (filterPeriod === 'custom') {
      if (filterDateFrom.trim()) {
        const from = new Date(filterDateFrom);
        from.setHours(0, 0, 0, 0);
        if (t < from.getTime()) return false;
      }
      if (filterDateTo.trim()) {
        const to = new Date(filterDateTo);
        to.setHours(23, 59, 59, 999);
        if (t > to.getTime()) return false;
      }
      return true;
    }
    if (periodMs > 0 && now - t > periodMs) return false;
    return true;
  };
  const inShowroomFilter = (showroomId: number) =>
    filterShowroomIds.length === 0 || filterShowroomIds.includes(showroomId);

  const filteredPlacements = placements.filter((p) => inPeriod(p.created_at) && inShowroomFilter(p.showroom_id));
  const filteredCandidatures = candidatures.filter((c) => inPeriod(c.created_at) && inShowroomFilter(c.showroom_id));

  const byShowroom = filteredPlacements.reduce((acc, p) => {
    const sid = p.showroom_id;
    if (!acc[sid]) acc[sid] = { showroom: p.showroom, placements: [] as PlacementWithDetails[] };
    acc[sid].placements.push(p);
    return acc;
  }, {} as Record<number, { showroom?: Showroom; placements: PlacementWithDetails[] }>);
  const showroomIdsWithPlacements = Object.keys(byShowroom)
    .map(Number)
    .filter((id) => byShowroom[id].placements.length > 0)
    .sort((a, b) => {
      const nameA = byShowroom[a].showroom?.name ?? '';
      const nameB = byShowroom[b].showroom?.name ?? '';
      return nameA.localeCompare(nameB);
    });

  const showroomIdsWithCandidaturesOnly = [...new Set(filteredCandidatures.map((c) => c.showroom_id))].filter(
    (sid) => !byShowroom[sid]?.placements?.length
  );
  showroomIdsWithCandidaturesOnly.sort((a, b) => {
    const nameA = filteredCandidatures.find((c) => c.showroom_id === a)?.showroom?.name ?? '';
    const nameB = filteredCandidatures.find((c) => c.showroom_id === b)?.showroom?.name ?? '';
    return nameA.localeCompare(nameB);
  });

  const allShowroomIds = [...new Set([...placements.map((p) => p.showroom_id), ...candidatures.map((c) => c.showroom_id)])];
  const showroomEntries = allShowroomIds
    .map((id) => {
      const name = placements.find((p) => p.showroom_id === id)?.showroom?.name ?? candidatures.find((c) => c.showroom_id === id)?.showroom?.name ?? `Boutique ${id}`;
      return { id, name };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  function getOfferThreadPlacementId(showroomPlacements: PlacementWithDetails[]): string {
    const sorted = [...showroomPlacements].sort(
      (a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
    );
    return sorted[0]?.id ?? showroomPlacements[0].id;
  }

  async function refetchCandidatures() {
    if (!activeBrand) return;
    await supabase.rpc('expire_pending_candidatures');
    const { data: list } = await supabase.from('candidatures').select('*').eq('brand_id', activeBrand.id).order('created_at', { ascending: false });
    const rows = (list as Candidature[]) ?? [];
    if (rows.length === 0) {
      setCandidatures([]);
      return;
    }
    const showroomIds = [...new Set(rows.map((c) => c.showroom_id))];
    const optionIds = rows.map((c) => c.showroom_commission_option_id).filter((id): id is number => id != null);
    const { data: showroomsData } = await supabase.from('showrooms').select('id, name, city, avatar_url').in('id', showroomIds);
    const showroomMap = Object.fromEntries(((showroomsData as Showroom[]) ?? []).map((s) => [s.id, s]));
    let optionMap: Record<number, ShowroomCommissionOption> = {};
    if (optionIds.length > 0) {
      const { data: optsData } = await supabase.from('showroom_commission_options').select('*').in('id', optionIds);
      optionMap = Object.fromEntries(((optsData as ShowroomCommissionOption[]) ?? []).map((o) => [o.id, o]));
    }
    setCandidatures(
      rows.map((c) => ({
        ...c,
        showroom: showroomMap[c.showroom_id],
        option: c.showroom_commission_option_id != null ? optionMap[c.showroom_commission_option_id] : undefined,
      }))
    );
  }

  async function openEditModal(c: CandidatureWithDetails) {
    setEditError(null);
    setEditCandidature(c);
    setEditOptionId(c.showroom_commission_option_id ?? null);
    setEditIsNegotiation(!!(c.negotiation_message?.trim()));
    setEditNegotiationMessage(c.negotiation_message ?? '');
    setEditMessage(c.message ?? '');
    setEditPartnershipStart(c.partnership_start_at ? c.partnership_start_at.slice(0, 10) : '');
    setEditPartnershipEnd(c.partnership_end_at ? c.partnership_end_at.slice(0, 10) : '');
    const { data } = await supabase.from('showroom_commission_options').select('*').eq('showroom_id', c.showroom_id).order('sort_order');
    setEditOptions((data as ShowroomCommissionOption[]) ?? []);
  }

  function closeEditModal() {
    setEditCandidature(null);
    setEditError(null);
  }

  async function saveEdit() {
    if (!editCandidature) return;
    const hasOption = editOptionId != null && !editIsNegotiation;
    const hasNegotiation = editIsNegotiation && editNegotiationMessage.trim().length > 0;
    if (!hasOption && !hasNegotiation) {
      setEditError('Choisissez une option ou renseignez votre négociation.');
      return;
    }
    if (!editPartnershipStart.trim() || !editPartnershipEnd.trim()) {
      setEditError('Renseignez la date de début et la date de fin du partenariat.');
      return;
    }
    setEditError(null);
    setSavingEdit(true);
    try {
      const startAt = new Date(editPartnershipStart);
      startAt.setHours(0, 0, 0, 0);
      const endAt = new Date(editPartnershipEnd);
      endAt.setHours(23, 59, 59, 999);
      const expiresAt = endAt.toISOString();
      const { error } = await supabase
        .from('candidatures')
        .update({
          showroom_commission_option_id: hasOption ? editOptionId : null,
          negotiation_message: hasNegotiation ? editNegotiationMessage.trim() : null,
          message: editMessage.trim() || null,
          partnership_start_at: startAt.toISOString(),
          partnership_end_at: endAt.toISOString(),
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editCandidature.id);
      if (error) {
        setEditError(error.message || 'Erreur lors de l’enregistrement.');
        return;
      }
      await refetchCandidatures();
      closeEditModal();
    } finally {
      setSavingEdit(false);
    }
  }

  async function cancelCandidature(id: string) {
    if (!confirm('Annuler cette candidature ?')) return;
    setCancellingId(id);
    try {
      const { error } = await supabase.from('candidatures').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id);
      if (error) {
        console.error('Annuler candidature:', error);
        alert(`Impossible d’annuler : ${error.message}`);
        return;
      }
      await refetchCandidatures();
    } finally {
      setCancellingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (entityType !== 'brand' || !activeBrand) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <p className="text-neutral-600">Sélectionnez une marque pour voir la messagerie.</p>
      </div>
    );
  }

  const hasAny = placements.length > 0 || candidatures.length > 0;
  const hasAnyFiltered = showroomIdsWithPlacements.length > 0 || showroomIdsWithCandidaturesOnly.length > 0;

  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900">Mes partenariats</h1>

      {hasAny && (
        <section className="flex flex-col sm:flex-row sm:items-center gap-4 my-6 p-4 rounded-xl bg-neutral-50 border border-neutral-200">
          <div className="flex items-center gap-2 shrink-0">
            <Calendar className="h-4 w-4 text-neutral-500" />
            <span className="text-sm font-medium text-neutral-700">Période</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(['7', '30', '90', 'all', 'custom'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setFilterPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterPeriod === p ? 'bg-neutral-900 text-white' : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'}`}
              >
                {p === 'all' ? 'Tout' : p === 'custom' ? 'Personnalisé' : `${p} jours`}
              </button>
            ))}
            {filterPeriod === 'custom' && (
              <span className="inline-flex flex-wrap items-center gap-2 text-sm">
                <label className="flex items-center gap-1.5">
                  <span className="text-neutral-600">Du</span>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="px-2 py-1.5 rounded border border-neutral-200 bg-white text-neutral-900"
                  />
                </label>
                <label className="flex items-center gap-1.5">
                  <span className="text-neutral-600">au</span>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="px-2 py-1.5 rounded border border-neutral-200 bg-white text-neutral-900"
                  />
                </label>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 sm:ml-4">
            <Filter className="h-4 w-4 text-neutral-500" />
            <span className="text-sm font-medium text-neutral-700">Boutique</span>
          </div>
          <select
            value={filterShowroomIds.length === 0 ? '' : String(filterShowroomIds[0])}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) setFilterShowroomIds([]);
              else setFilterShowroomIds([Number(v)]);
            }}
            className="px-3 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm min-w-[160px]"
          >
            <option value="">Toutes</option>
            {showroomEntries.map(({ id, name }) => (
              <option key={id} value={String(id)}>{name}</option>
            ))}
          </select>
        </section>
      )}

      {!hasAny && (
        <div className="mt-8 p-8 rounded-xl border border-neutral-200 bg-white text-center text-neutral-500">
          <MessageSquare className="h-10 w-10 mx-auto text-neutral-300 mb-2" />
          <p>Aucun échange pour le moment. Candidater depuis la page Vendre mes produits.</p>
          <Link href="/admin/discover" className="mt-4 inline-block text-sm font-medium text-neutral-900 hover:underline">Vendre mes produits</Link>
        </div>
      )}

      {hasAny && !hasAnyFiltered && (
        <p className="mt-6 text-center text-neutral-500">Aucun partenariat ne correspond aux filtres.</p>
      )}

      {hasAnyFiltered && showroomIdsWithPlacements.length > 0 && (
        <div className="mt-8 space-y-6">
          {showroomIdsWithPlacements.map((showroomId) => {
            const { showroom, placements: showroomPlacements } = byShowroom[showroomId];
            const offerLinkId = getOfferThreadPlacementId(showroomPlacements);
            return (
              <section key={`p-${showroomId}`} className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                <div className="p-4 border-b border-neutral-100 bg-neutral-50/50 flex items-center gap-3 flex-wrap">
                  {showroom?.avatar_url?.trim() ? (
                    <img src={showroom.avatar_url.trim()} alt="" className="w-12 h-12 rounded-full object-cover border border-neutral-200 shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center shrink-0">
                      <Store className="h-6 w-6 text-neutral-600" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-neutral-900">{showroom?.name ?? 'Boutique'}</h2>
                    {showroom?.city && <p className="text-sm text-neutral-500">{showroom.city}</p>}
                  </div>
                  <span className="text-sm text-neutral-500 shrink-0">
                    {showroomPlacements.length} produit{showroomPlacements.length > 1 ? 's' : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => activeBrand && handleGoToMessaging(activeBrand.id, showroomId)}
                    disabled={messagingNavigating}
                    className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-60"
                  >
                    {messagingNavigating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                    Messagerie
                  </button>
                </div>
                <ul className="divide-y divide-neutral-100">
                  {showroomPlacements.map((p) => (
                    <li key={p.id} className="flex items-center gap-4 p-4">
                      <div className="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center overflow-hidden shrink-0">
                        {p.product?.image_url ? <img src={p.product.image_url} alt="" className="w-full h-full object-cover" /> : <Package className="h-6 w-6 text-neutral-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-neutral-900 truncate">{p.product?.product_name ?? 'Produit'}</p>
                        <p className="text-sm text-neutral-500">
                          {p.stock_quantity != null && p.stock_quantity > 0 && `${p.stock_quantity} pièce(s)`}
                          {p.agreed_commission_rate != null && ` · ${p.agreed_commission_rate} % commission`}
                        </p>
                      </div>
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-neutral-200 text-neutral-600 shrink-0">{getInitiatorBadgeLabel(p.initiated_by, activeBrand?.brand_name, showroom?.name)}</span>
                      <span className="inline-block px-2.5 py-1 rounded-md text-xs font-medium bg-neutral-100 text-neutral-700 shrink-0">{getStatusDisplayLabel(p.status, p.initiated_by, activeBrand?.brand_name, showroom?.name)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {hasAnyFiltered && showroomIdsWithCandidaturesOnly.length > 0 && (
        <div className={`space-y-6 ${showroomIdsWithPlacements.length > 0 ? 'mt-8' : 'mt-8'}`}>
          {showroomIdsWithCandidaturesOnly.map((showroomId) => {
            const showroomCandidatures = filteredCandidatures.filter((c) => c.showroom_id === showroomId);
            const latest = showroomCandidatures[0];
            const showroom = latest?.showroom;
            return (
              <section key={`c-${showroomId}`} className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                <div className="p-4 border-b border-neutral-100 bg-neutral-50/50 flex items-center gap-3 flex-wrap">
                  {showroom?.avatar_url?.trim() ? (
                    <img src={showroom.avatar_url.trim()} alt="" className="w-12 h-12 rounded-full object-cover border border-neutral-200 shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center shrink-0">
                      <Store className="h-6 w-6 text-neutral-600" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-neutral-900">{showroom?.name ?? 'Boutique'}</h2>
                    {showroom?.city && <p className="text-sm text-neutral-500">{showroom.city}</p>}
                  </div>
                  <span className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-medium ${
                    latest.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                    latest.status === 'accepted' ? 'bg-green-100 text-green-800' :
                    'bg-neutral-100 text-neutral-700'
                  }`}>
                    {candidatureStatusLabel[latest.status] ?? latest.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => activeBrand && handleGoToMessaging(activeBrand.id, showroomId)}
                    disabled={messagingNavigating}
                    className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-60"
                  >
                    {messagingNavigating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                    Messagerie
                  </button>
                </div>
                <ul className="divide-y divide-neutral-100">
                  {showroomCandidatures.map((c) => (
                    <li key={c.id} className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-neutral-700">
                            {c.showroom_commission_option_id != null ? (
                              <>Option : {optionSummary(c.option ?? null)}</>
                            ) : c.negotiation_message ? (
                              <>Négociation : {c.negotiation_message.slice(0, 200)}{c.negotiation_message.length > 200 ? '…' : ''}</>
                            ) : (
                              '—'
                            )}
                          </p>
                          {c.message?.trim() && (
                            <p className="mt-1 text-sm text-neutral-600 italic">&quot;{c.message.slice(0, 150)}{c.message.length > 150 ? '…' : ''}&quot;</p>
                          )}
                          {c.created_at && (
                            <p className="mt-1 text-xs text-neutral-500">Envoyée le {new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          )}
                          {c.status === 'pending' && (c.partnership_start_at || c.partnership_end_at) && (
                            <p className="mt-1 text-xs text-amber-700">
                              Partenariat {c.partnership_start_at && c.partnership_end_at
                                ? `du ${new Date(c.partnership_start_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} au ${new Date(c.partnership_end_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`
                                : c.partnership_end_at
                                  ? `jusqu'au ${new Date(c.partnership_end_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
                                  : `à partir du ${new Date(c.partnership_start_at!).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                            </p>
                          )}
                          {c.status === 'pending' && !c.partnership_start_at && !c.partnership_end_at && c.expires_at && (
                            <p className="mt-1 text-xs text-amber-700">Valable jusqu'au {new Date(c.expires_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          )}
                          {c.status === 'expired' && c.expires_at && (
                            <p className="mt-1 text-xs text-neutral-500">Expirée le {new Date(c.expires_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          )}
                          {lastMessageByCandidatureId[c.id]?.content && (
                            <p className="mt-2 text-sm text-neutral-600 truncate">
                              Dernier message : {lastMessageByCandidatureId[c.id].content!.slice(0, 80)}
                              {lastMessageByCandidatureId[c.id].content!.length > 80 ? '…' : ''}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setDetailCandidature(c)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 text-neutral-700 text-xs font-medium hover:bg-neutral-50"
                          >
                            <MessageSquare className="h-3.5 w-3.5" /> Voir le détail
                          </button>
                        {c.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditModal(c)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 text-neutral-700 text-xs font-medium hover:bg-neutral-50"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Modifier
                            </button>
                            <button
                              type="button"
                              onClick={() => cancelCandidature(c.id)}
                              disabled={cancellingId === c.id}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs font-medium hover:bg-red-50 disabled:opacity-60"
                            >
                              {cancellingId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />} Annuler
                            </button>
                          </>
                        )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {editCandidature && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" aria-hidden onClick={closeEditModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden pointer-events-auto flex flex-col text-neutral-900" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-900">Modifier la candidature</h2>
                <button type="button" onClick={closeEditModal} className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900" aria-label="Fermer">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 space-y-4">
                <p className="text-sm text-neutral-600">{editCandidature.showroom?.name}</p>
                {editError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{editError}</p>}
                {editOptions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-neutral-700">Option choisie</p>
                    <ul className="space-y-2">
                      {editOptions.map((opt) => (
                        <label key={opt.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${editOptionId === opt.id && !editIsNegotiation ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200'}`}>
                          <input type="radio" name="editOption" checked={editOptionId === opt.id && !editIsNegotiation} onChange={() => { setEditOptionId(opt.id); setEditIsNegotiation(false); setEditError(null); }} className="rounded-full border-neutral-300 text-neutral-900 focus:ring-neutral-900" />
                          <span className="text-sm text-neutral-900">{opt.rent != null && opt.rent > 0 ? `${opt.rent}€` : ''}{opt.rent_period === 'week' ? '/sem.' : opt.rent_period === 'one_off' ? ' unique' : '/mois'} {opt.commission_percent != null ? ` · ${opt.commission_percent} %` : ''} {opt.description?.trim() ?? ''}</span>
                        </label>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${editIsNegotiation ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200'}`}>
                    <input type="radio" name="editOption" checked={editIsNegotiation} onChange={() => { setEditIsNegotiation(true); setEditOptionId(null); setEditError(null); }} className="rounded-full border-neutral-300 text-neutral-900 focus:ring-neutral-900" />
                    <span className="text-sm font-medium text-neutral-900">Négociation (tarif différent)</span>
                  </label>
                  {editIsNegotiation && (
                    <textarea value={editNegotiationMessage} onChange={(e) => setEditNegotiationMessage(e.target.value)} placeholder="Votre proposition…" rows={3} className="mt-2 w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900" />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-900 mb-1">Message (optionnel)</label>
                  <textarea value={editMessage} onChange={(e) => setEditMessage(e.target.value)} placeholder="Message pour la boutique…" rows={2} className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900" />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-900 mb-2">Période du partenariat</p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs text-neutral-600 block mb-1">Date de début</span>
                      <input
                        type="date"
                        value={editPartnershipStart}
                        onChange={(e) => setEditPartnershipStart(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-neutral-600 block mb-1">Date de fin</span>
                      <input
                        type="date"
                        value={editPartnershipEnd}
                        onChange={(e) => setEditPartnershipEnd(e.target.value)}
                        min={editPartnershipStart || undefined}
                        className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      />
                    </label>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-neutral-200 flex gap-2 justify-end">
                <button type="button" onClick={closeEditModal} className="px-4 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-700 font-medium hover:bg-neutral-50">
                  Annuler
                </button>
                <button type="button" disabled={savingEdit || (!editOptionId && !(editIsNegotiation && editNegotiationMessage.trim())) || !editPartnershipStart.trim() || !editPartnershipEnd.trim()} onClick={saveEdit} className="px-4 py-2 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                  {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enregistrer
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {detailCandidature && (
        <CandidatureDetailModal
          candidature={detailCandidature}
          onClose={() => setDetailCandidature(null)}
          viewerSide="brand"
          onCandidatureUpdated={(updated) => setDetailCandidature(updated)}
          onEditRequest={(c) => {
            openEditModal(c);
            setDetailCandidature(null);
          }}
        />
      )}
    </div>
  );
}
