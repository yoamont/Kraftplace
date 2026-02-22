'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAdminEntity } from '../context/AdminEntityContext';
import {
  Loader2,
  Package,
  Store,
  Sparkles,
  RefreshCw,
  CheckCircle,
  XCircle,
  Pencil,
  MessageSquare,
  X,
  Plus,
  ChevronRight,
} from 'lucide-react';
import type { Placement, Product, Brand, Candidature, ShowroomCommissionOption, Message } from '@/lib/supabase';
import { getOrCreateConversationId } from '@/lib/conversations';
import { getStatusDisplayLabel, getInitiatorBadgeLabel } from '@/lib/placements';
import { CandidatureDetailModal } from '../components/CandidatureDetailModal';
import { useMessengerPanel } from '../context/MessengerPanelContext';

type PlacementWithDetails = Placement & { product?: Product; brand?: Brand };
type CandidatureWithDetails = Candidature & { brand?: Brand; option?: ShowroomCommissionOption };

function candidatureOptionSummary(opt: ShowroomCommissionOption | null): string {
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

function plusValuePotentielle(quantity: number, priceTTC: number, commissionPercent: number): number {
  return quantity * priceTTC * (commissionPercent / 100);
}

function getOfferThreadPlacementId(placements: PlacementWithDetails[]): string | null {
  if (placements.length === 0) return null;
  const sorted = [...placements].sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());
  return sorted[0].id;
}

export default function CurationPage() {
  const router = useRouter();
  const { entityType, activeShowroom, userId } = useAdminEntity();
  const { openMessenger } = useMessengerPanel();
  const [placements, setPlacements] = useState<PlacementWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptModal, setAcceptModal] = useState(false);
  const [counterModal, setCounterModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<{ brandId: number; brandName: string; placements: PlacementWithDetails[] } | null>(null);
  const [acceptQuantities, setAcceptQuantities] = useState<Record<string, string>>({});
  const [counterForm, setCounterForm] = useState<Record<string, { quantity: number; commission: string }>>({});
  const [counterAdd, setCounterAdd] = useState<Record<number, { selected: boolean; quantity: number; commission: string }>>({});
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [candidatures, setCandidatures] = useState<CandidatureWithDetails[]>([]);
  const [negotiateCandidature, setNegotiateCandidature] = useState<CandidatureWithDetails | null>(null);
  const [negotiateMessage, setNegotiateMessage] = useState('');
  const [detailCandidature, setDetailCandidature] = useState<CandidatureWithDetails | null>(null);
  const [lastMessageByThreadId, setLastMessageByThreadId] = useState<Record<string, Message>>({});
  const [lastMessageByCandidatureId, setLastMessageByCandidatureId] = useState<Record<string, Message>>({});

  const loadCandidatures = useCallback(async () => {
    if (entityType !== 'showroom' || !activeShowroom) return;
    await supabase.rpc('expire_pending_candidatures');
    const { data: list } = await supabase.from('candidatures').select('*').eq('showroom_id', activeShowroom.id).order('created_at', { ascending: false });
    const rows = (list as Candidature[]) ?? [];
    if (rows.length === 0) {
      setCandidatures([]);
      return;
    }
    const brandIds = [...new Set(rows.map((c) => c.brand_id))];
    const optionIds = rows.map((c) => c.showroom_commission_option_id).filter((id): id is number => id != null);
    const { data: brandsData } = await supabase.from('brands').select('id, brand_name, avatar_url').in('id', brandIds);
    const brandMap = Object.fromEntries(((brandsData as Brand[]) ?? []).map((b) => [b.id, b]));
    let optionMap: Record<number, ShowroomCommissionOption> = {};
    if (optionIds.length > 0) {
      const { data: optsData } = await supabase.from('showroom_commission_options').select('*').in('id', optionIds);
      optionMap = Object.fromEntries(((optsData as ShowroomCommissionOption[]) ?? []).map((o) => [o.id, o]));
    }
    setCandidatures(
      rows.map((c) => ({
        ...c,
        brand: brandMap[c.brand_id],
        option: c.showroom_commission_option_id != null ? optionMap[c.showroom_commission_option_id] : undefined,
      }))
    );
  }, [entityType, activeShowroom?.id]);

  const loadPlacements = useCallback(async () => {
    if (entityType !== 'showroom' || !activeShowroom) return;
    const { data: placementsData } = await supabase
      .from('placements')
      .select('*')
      .eq('showroom_id', activeShowroom.id)
      .order('created_at', { ascending: false });
    const list = (placementsData as Placement[]) ?? [];
    if (list.length === 0) {
      setPlacements([]);
      return;
    }
    const productIds = [...new Set(list.map((p) => p.product_id))];
    const { data: productsData } = await supabase.from('products').select('id, product_name, brand_id, price, image_url, commission_percent').in('id', productIds);
    const products = (productsData as (Product & { brand_id: number })[]) ?? [];
    const brandIds = [...new Set(products.map((p) => p.brand_id))];
    const { data: brandsData } = await supabase.from('brands').select('id, brand_name, avatar_url').in('id', brandIds);
    const brands = (brandsData as Brand[]) ?? [];
    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));
    const brandMap = Object.fromEntries(brands.map((b) => [b.id, b]));
    setPlacements(
      list.map((p) => ({
        ...p,
        product: productMap[p.product_id],
        brand: productMap[p.product_id] ? brandMap[(productMap[p.product_id] as Product & { brand_id: number }).brand_id] : undefined,
      }))
    );
  }, [entityType, activeShowroom?.id]);

  useEffect(() => {
    if (entityType !== 'showroom' || !activeShowroom) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([loadPlacements(), loadCandidatures()]).finally(() => setLoading(false));
  }, [loadPlacements, loadCandidatures, entityType, activeShowroom]);

  useEffect(() => {
    if (entityType !== 'showroom' || placements.length === 0 && candidatures.length === 0) return;
    (async () => {
      const byBrandList = placements.reduce((acc, p) => {
        const brandId = (p.product as Product & { brand_id?: number })?.brand_id ?? 0;
        if (!acc[brandId]) acc[brandId] = [];
        acc[brandId].push(p);
        return acc;
      }, {} as Record<number, PlacementWithDetails[]>);
      const threadIds = Object.values(byBrandList).map((arr) => getOfferThreadPlacementId(arr)).filter((id): id is string => id != null);
      const [threadMsgsRes, convIds] = await Promise.all([
        threadIds.length > 0 ? supabase.from('messages').select('id, conversation_id, sender_id, sender_role, content, is_read, created_at, message_type, placement_id').in('placement_id', threadIds).order('created_at', { ascending: false }) : { data: [] as Message[] },
        candidatures.length > 0
          ? Promise.all(
              [...new Set(candidatures.map((c) => `${c.brand_id}-${c.showroom_id}`))].map((key) => {
                const [bid, sid] = key.split('-').map(Number);
                return getOrCreateConversationId(bid, sid);
              })
            )
          : [] as Promise<string | null>[],
      ]);
      const threadMsgs = (threadMsgsRes.data as Message[]) ?? [];
      const resolvedConvIds = await Promise.all(convIds);
      const pairToConvId = new Map<string, string>();
      const uniquePairs = [...new Set(candidatures.map((c) => `${c.brand_id}-${c.showroom_id}`))];
      uniquePairs.forEach((key, i) => {
        const id = resolvedConvIds[i];
        if (id) pairToConvId.set(key, id);
      });
      const lastByThread: Record<string, Message> = {};
      threadMsgs.forEach((m) => { if (m.placement_id && !lastByThread[m.placement_id]) lastByThread[m.placement_id] = m; });

      let lastByCandidature: Record<string, Message> = {};
      if (resolvedConvIds.length > 0 && resolvedConvIds.some(Boolean)) {
        const convIdsFiltered = resolvedConvIds.filter((id): id is string => id != null);
        const { data: msgRows } = await supabase
          .from('messages')
          .select('id, conversation_id, content, created_at, message_type')
          .in('conversation_id', convIdsFiltered)
          .order('created_at', { ascending: false });
        const msgs = (msgRows as Message[]) ?? [];
        const lastByConvId: Record<string, Message> = {};
        msgs.forEach((m) => {
          if (!lastByConvId[m.conversation_id]) lastByConvId[m.conversation_id] = m;
        });
        candidatures.forEach((c) => {
          const convId = pairToConvId.get(`${c.brand_id}-${c.showroom_id}`);
          if (convId && lastByConvId[convId]) lastByCandidature[c.id] = lastByConvId[convId];
        });
      }
      setLastMessageByThreadId(lastByThread);
      setLastMessageByCandidatureId(lastByCandidature);
    })();
  }, [entityType, placements, candidatures]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && entityType === 'showroom' && activeShowroom) {
        setRefreshing(true);
        loadPlacements().finally(() => setRefreshing(false));
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadPlacements, entityType, activeShowroom]);

  async function handleRefresh() {
    if (!activeShowroom) return;
    setRefreshing(true);
    await Promise.all([loadPlacements(), loadCandidatures()]);
    setRefreshing(false);
  }

  async function acceptCandidature(id: string) {
    setSubmitting(true);
    try {
      await supabase.from('candidatures').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('id', id);
      await loadCandidatures();
    } finally {
      setSubmitting(false);
    }
  }

  async function refuseCandidature(id: string) {
    if (!confirm('Refuser cette candidature ?')) return;
    setSubmitting(true);
    try {
      await supabase.from('candidatures').update({ status: 'declined', updated_at: new Date().toISOString() }).eq('id', id);
      await loadCandidatures();
    } finally {
      setSubmitting(false);
    }
  }

  function openNegotiateModal(c: CandidatureWithDetails) {
    setNegotiateCandidature(c);
    setNegotiateMessage('');
  }

  async function sendNegotiateMessage() {
    if (!userId || !negotiateCandidature || !negotiateMessage.trim() || !entityType) return;
    const senderRole: 'brand' | 'boutique' = entityType === 'showroom' ? 'boutique' : 'brand';
    const conversationId = await getOrCreateConversationId(negotiateCandidature.brand_id, negotiateCandidature.showroom_id);
    if (!conversationId) return;
    setSubmitting(true);
    try {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: userId,
        sender_role: senderRole,
        content: negotiateMessage.trim(),
        message_type: 'candidature_action',
        is_read: false,
      });
      setNegotiateCandidature(null);
      setNegotiateMessage('');
      await loadCandidatures();
    } finally {
      setSubmitting(false);
    }
  }

  const byBrand = placements.reduce((acc, p) => {
    const brandId = p.product?.brand_id ?? 0;
    if (!acc[brandId]) acc[brandId] = { brand: p.brand, placements: [] as PlacementWithDetails[] };
    acc[brandId].placements.push(p);
    return acc;
  }, {} as Record<number, { brand?: Brand; placements: PlacementWithDetails[] }>);

  const brandIds = Object.keys(byBrand)
    .map(Number)
    .filter((id) => byBrand[id].placements.length > 0)
    .sort((a, b) => {
      const nameA = byBrand[a].brand?.brand_name ?? '';
      const nameB = byBrand[b].brand?.brand_name ?? '';
      return nameA.localeCompare(nameB);
    });

  // Regrouper les candidatures par marque (même logique que "par boutique" côté marque)
  const candidaturesByBrand = candidatures.reduce((acc, c) => {
    const bid = c.brand_id;
    if (!acc[bid]) acc[bid] = { brand: c.brand, candidatures: [] as CandidatureWithDetails[] };
    acc[bid].candidatures.push(c);
    return acc;
  }, {} as Record<number, { brand?: Brand; candidatures: CandidatureWithDetails[] }>);
  // Marques avec candidatures mais sans placement encore (comme "showroomIdsWithCandidaturesOnly" côté marque)
  const brandIdsCandidaturesOnly = Object.keys(candidaturesByBrand)
    .map(Number)
    .filter((bid) => !byBrand[bid]?.placements?.length)
    .sort((a, b) => {
      const nameA = candidaturesByBrand[a].brand?.brand_name ?? '';
      const nameB = candidaturesByBrand[b].brand?.brand_name ?? '';
      return nameA.localeCompare(nameB);
    });

  function openAcceptModal(brandId: number, brandPlacements: PlacementWithDetails[]) {
    const pending = brandPlacements.filter((p) => (p.status ?? 'pending') === 'pending');
    const qty: Record<string, string> = {};
    pending.forEach((p) => {
      qty[p.id] = String(p.stock_quantity ?? 1);
    });
    setAcceptQuantities(qty);
    setSelectedOffer({ brandId, brandName: byBrand[brandId].brand?.brand_name ?? 'Marque', placements: pending });
    setAcceptModal(true);
    setError(null);
  }

  async function submitAccept() {
    if (!activeShowroom || !selectedOffer) return;
    const pending = selectedOffer.placements;
    for (const p of pending) {
      const raw = acceptQuantities[p.id];
      const qty = raw ? parseInt(raw, 10) : 1;
      if (Number.isNaN(qty) || qty < 1) {
        setError('Quantité invalide pour « ' + (p.product?.product_name ?? '') + ' ».');
        return;
      }
    }
    setSubmitting(true);
    setError(null);
    try {
      for (const p of pending) {
        const qty = Math.max(1, parseInt(acceptQuantities[p.id], 10) || 1);
        await supabase
          .from('placements')
          .update({
            status: 'active',
            stock_quantity: qty,
            agreed_commission_rate: p.agreed_commission_rate ?? activeShowroom.default_commission_rate ?? 20,
          })
          .eq('id', p.id);
      }
      const threadId = getOfferThreadPlacementId(pending);
      if (threadId && userId && selectedOffer && activeShowroom) {
        const cid = await getOrCreateConversationId(selectedOffer.brandId, activeShowroom.id);
        if (cid) {
          await supabase.from('messages').insert({
            conversation_id: cid,
            sender_id: userId,
            sender_role: 'boutique',
            content: `[Modification] La boutique ${activeShowroom.name ?? 'La boutique'} a accepté l'offre.`,
            message_type: 'placement_action',
            placement_id: threadId,
            is_read: false,
          });
        }
      }
      // Marquer la candidature comme acceptée pour que la marque voie la boutique dans "Demander un paiement"
      await supabase
        .from('candidatures')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('showroom_id', activeShowroom.id)
        .eq('brand_id', selectedOffer.brandId)
        .in('status', ['pending']);
      setAcceptModal(false);
      setSelectedOffer(null);
      await loadPlacements();
      await loadCandidatures();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function refuseOffer(brandId: number, brandPlacements: PlacementWithDetails[], e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const pending = brandPlacements.filter((p) => (p.status ?? 'pending') === 'pending');
    if (pending.length === 0) return;
    if (!confirm(`Refuser l'offre de ${byBrand[brandId].brand?.brand_name ?? 'cette marque'} ? Les ${pending.length} produit(s) en attente seront annulés.`)) return;
    setSubmitting(true);
    try {
      const threadId = getOfferThreadPlacementId(brandPlacements);
      if (threadId && userId && activeShowroom) {
        const cid = await getOrCreateConversationId(brandId, activeShowroom.id);
        if (cid) {
          await supabase.from('messages').insert({
            conversation_id: cid,
            sender_id: userId,
            sender_role: 'boutique',
            content: `[Modification] La boutique ${activeShowroom?.name ?? 'La boutique'} a refusé l'offre.`,
            message_type: 'placement_action',
            placement_id: threadId,
            is_read: false,
          });
        }
      }
      await supabase.from('placements').delete().in('id', pending.map((p) => p.id));
      await loadPlacements();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelMyOffer(brandId: number, brandPlacements: PlacementWithDetails[], e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const myPending = brandPlacements.filter((p) => (p.status ?? 'pending') === 'pending' && p.initiated_by === 'showroom');
    if (myPending.length === 0) return;
    if (!confirm(`Annuler votre offre pour ${byBrand[brandId].brand?.brand_name ?? 'cette marque'} ? Les ${myPending.length} produit(s) proposés seront retirés.`)) return;
    setSubmitting(true);
    try {
      const threadId = getOfferThreadPlacementId(brandPlacements);
      if (threadId && userId && activeShowroom) {
        const cid = await getOrCreateConversationId(brandId, activeShowroom.id);
        if (cid) {
          await supabase.from('messages').insert({
            conversation_id: cid,
            sender_id: userId,
            sender_role: 'boutique',
            content: `[Modification] La boutique ${activeShowroom?.name ?? 'La boutique'} a annulé son offre.`,
            message_type: 'placement_action',
            placement_id: threadId,
            is_read: false,
          });
        }
      }
      await supabase.from('placements').delete().in('id', myPending.map((p) => p.id));
      await loadPlacements();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function openCounterModal(brandId: number, brandPlacements: PlacementWithDetails[], e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const form: Record<string, { quantity: number; commission: string }> = {};
    brandPlacements.forEach((p) => {
      form[p.id] = {
        quantity: p.stock_quantity ?? 1,
        commission: p.agreed_commission_rate != null ? String(p.agreed_commission_rate) : '',
      };
    });
    setCounterForm(form);
    const { data: productsData } = await supabase.from('products').select('id, product_name, brand_id, price, image_url, commission_percent').eq('brand_id', brandId);
    const allProducts = (productsData as Product[]) ?? [];
    const placedIds = new Set(brandPlacements.map((p) => p.product_id));
    const catalog = allProducts.filter((p) => !placedIds.has(p.id));
    setCatalogProducts(catalog);
    const add: Record<number, { selected: boolean; quantity: number; commission: string }> = {};
    catalog.forEach((prod) => {
      add[prod.id] = {
        selected: false,
        quantity: 1,
        commission: prod.commission_percent != null ? String(prod.commission_percent) : String(activeShowroom?.default_commission_rate ?? 20),
      };
    });
    setCounterAdd(add);
    setSelectedOffer({ brandId, brandName: byBrand[brandId].brand?.brand_name ?? 'Marque', placements: brandPlacements });
    setCounterModal(true);
    setError(null);
  }

  function setCounterPlacement(placementId: string, field: 'quantity' | 'commission', value: number | string) {
    setCounterForm((prev) => {
      const cur = prev[placementId] ?? { quantity: 1, commission: '' };
      if (field === 'quantity') return { ...prev, [placementId]: { ...cur, quantity: Math.max(0, value as number) } };
      return { ...prev, [placementId]: { ...cur, commission: value as string } };
    });
  }

  function setCounterAddProduct(productId: number, field: 'selected' | 'quantity' | 'commission', value: boolean | number | string) {
    setCounterAdd((prev) => {
      const cur = prev[productId] ?? { selected: false, quantity: 1, commission: '' };
      if (field === 'selected') return { ...prev, [productId]: { ...cur, selected: value as boolean } };
      if (field === 'quantity') return { ...prev, [productId]: { ...cur, quantity: Math.max(0, value as number) } };
      return { ...prev, [productId]: { ...cur, commission: value as string } };
    });
  }

  async function submitCounterOffer() {
    if (!activeShowroom || !userId || !selectedOffer) return;
    const brandPlacements = selectedOffer.placements;
    const threadId = getOfferThreadPlacementId(brandPlacements);
    if (!threadId) return;
    setSubmitting(true);
    setError(null);
    try {
      for (const p of brandPlacements) {
        const form = counterForm[p.id];
        if (!form) continue;
        const qty = form.quantity;
        const rate = form.commission.trim() ? parseInt(form.commission, 10) : null;
        const rateFinal = rate != null && !Number.isNaN(rate) ? rate : null;
        if (qty === 0) {
          await supabase.from('placements').delete().eq('id', p.id);
        } else {
          await supabase.from('placements').update({ stock_quantity: qty, agreed_commission_rate: rateFinal }).eq('id', p.id);
        }
      }
      const toAdd = catalogProducts.filter((prod) => counterAdd[prod.id]?.selected && (counterAdd[prod.id].quantity ?? 0) > 0);
      for (const prod of toAdd) {
        const cfg = counterAdd[prod.id];
        const qty = cfg.quantity ?? 1;
        const rate = cfg.commission.trim() ? parseInt(cfg.commission, 10) : null;
        await supabase.from('placements').insert({
          product_id: prod.id,
          showroom_id: activeShowroom.id,
          status: 'pending',
          stock_quantity: qty,
          agreed_commission_rate: rate != null && !Number.isNaN(rate) ? rate : null,
          initiated_by: 'showroom',
        });
      }
      const showroomName = activeShowroom.name ?? 'La boutique';
      const cid = await getOrCreateConversationId(selectedOffer.brandId, activeShowroom.id);
      if (cid) {
        await supabase.from('messages').insert({
          conversation_id: cid,
          sender_id: userId,
          sender_role: 'boutique',
          content: `[Modification] La boutique ${showroomName} a envoyé une contre-offre : modification des quantités et commissions.${toAdd.length > 0 ? ` ${toAdd.length} nouveau(x) produit(s) proposé(s).` : ''}`,
          message_type: 'placement_action',
          placement_id: threadId,
          is_read: false,
        });
      }
      setCounterModal(false);
      setSelectedOffer(null);
      await loadPlacements();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (entityType !== 'showroom' || !activeShowroom) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <p className="text-neutral-600">Sélectionnez une boutique pour voir la messagerie.</p>
      </div>
    );
  }

  function getPlusValue(p: PlacementWithDetails): number | null {
    const qty = p.stock_quantity ?? 1;
    const price = p.product?.price;
    const rate = p.agreed_commission_rate ?? activeShowroom?.default_commission_rate ?? 0;
    if (price == null || rate == null) return null;
    return plusValuePotentielle(qty, price, rate);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Messagerie</h1>
          <p className="mt-1 text-sm text-neutral-500">Un bloc par marque. Ouvrez une conversation pour voir tout l’historique des échanges et envoyer des messages.</p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Rafraîchir
        </button>
      </div>

      {placements.length === 0 && candidatures.length === 0 && (
        <div className="mt-8 p-8 rounded-xl border border-neutral-200 bg-white text-center text-neutral-500">
          <Package className="h-10 w-10 mx-auto text-neutral-300 mb-2" />
          <p>Aucun échange pour le moment.</p>
        </div>
      )}

      {brandIdsCandidaturesOnly.length > 0 && (
        <div className="mt-8 space-y-6">
          <h2 className="text-sm font-semibold text-neutral-700">Candidatures reçues (sans produits encore)</h2>
          {brandIdsCandidaturesOnly.map((brandId) => {
            const { brand: brandInfo, candidatures: brandCandidatures } = candidaturesByBrand[brandId];
            const hasPending = brandCandidatures.some((c) => c.status === 'pending');
            return (
              <section key={`c-${brandId}`} className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                <div className="p-4 border-b border-neutral-100 bg-neutral-50/50 flex items-center gap-3 flex-wrap">
                  {brandInfo?.avatar_url?.trim() ? (
                    <img src={brandInfo.avatar_url.trim()} alt="" className="w-12 h-12 rounded-full object-cover border border-neutral-200 shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center shrink-0">
                      <Sparkles className="h-6 w-6 text-neutral-600" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-neutral-900">{brandInfo?.brand_name ?? 'Marque'}</h2>
                    <p className="text-sm text-neutral-500">
                      {brandCandidatures.length} candidature{brandCandidatures.length > 1 ? 's' : ''}
                    </p>
                    {brandCandidatures.some((c) => lastMessageByCandidatureId[c.id]) && (
                      <p className="text-sm text-neutral-600 truncate mt-1">
                        Dernier message : {(() => {
                          const cWithMsg = brandCandidatures.find((c) => lastMessageByCandidatureId[c.id]);
                          const msg = cWithMsg && lastMessageByCandidatureId[cWithMsg.id];
                          return msg ? `${msg.content.slice(0, 80)}${msg.content.length > 80 ? '…' : ''}` : '';
                        })()}
                      </p>
                    )}
                  </div>
                  {hasPending && (
                    <span className="shrink-0 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-800">
                      En attente de réponse
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => activeShowroom && openMessenger({ brandId, showroomId: activeShowroom.id, title: brandInfo?.brand_name ?? 'Marque', avatarUrl: brandInfo?.avatar_url })}
                    className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Messagerie
                  </button>
                </div>
                <ul className="divide-y divide-neutral-100">
                  {brandCandidatures.map((c) => (
                    <li key={c.id} className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-neutral-700">
                            {c.showroom_commission_option_id != null ? (
                              <>Option : {candidatureOptionSummary(c.option ?? null)}</>
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
                          {c.status === 'pending' && c.expires_at && (
                            <p className="mt-1 text-xs text-amber-700">Valable jusqu'au {new Date(c.expires_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          )}
                          {c.status === 'expired' && c.expires_at && (
                            <p className="mt-1 text-xs text-neutral-500">Expirée le {new Date(c.expires_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          )}
                          {lastMessageByCandidatureId[c.id] && (
                            <p className="mt-2 text-sm text-neutral-600 truncate">
                              Dernier message : {lastMessageByCandidatureId[c.id].content.slice(0, 80)}
                              {lastMessageByCandidatureId[c.id].content.length > 80 ? '…' : ''}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-medium ${
                            c.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                            c.status === 'accepted' ? 'bg-green-100 text-green-800' :
                            c.status === 'declined' || c.status === 'expired' ? 'bg-neutral-100 text-neutral-600' :
                            'bg-neutral-100 text-neutral-700'
                          }`}>
                            {c.status === 'pending' ? 'En attente' : c.status === 'accepted' ? 'Acceptée' : c.status === 'declined' ? 'Refusée' : c.status === 'expired' ? 'Expirée' : c.status}
                          </span>
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
                                onClick={() => acceptCandidature(c.id)}
                                disabled={submitting}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-60"
                              >
                                <CheckCircle className="h-3.5 w-3.5" /> Accepter
                              </button>
                              <button
                                type="button"
                                onClick={() => refuseCandidature(c.id)}
                                disabled={submitting}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs font-medium hover:bg-red-50 disabled:opacity-60"
                              >
                                <XCircle className="h-3.5 w-3.5" /> Refuser
                              </button>
                              <button
                                type="button"
                                onClick={() => openNegotiateModal(c)}
                                disabled={submitting}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 text-neutral-700 text-xs font-medium hover:bg-neutral-50 disabled:opacity-60"
                              >
                                <MessageSquare className="h-3.5 w-3.5" /> Négocier
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

      {brandIds.length > 0 && (
        <div className="mt-8 space-y-6">
          {brandIds.map((brandId) => {
            const { brand, placements: brandPlacements } = byBrand[brandId];
            const totalPlusValue = brandPlacements.reduce((sum, p) => sum + (getPlusValue(p) ?? 0), 0);
            const pendingPlacements = brandPlacements.filter((p) => (p.status ?? 'pending') === 'pending');
            const hasPending = pendingPlacements.length > 0;
            const receivedOffer = hasPending && pendingPlacements.some((p) => p.initiated_by === 'brand');
            const myOfferPending = hasPending && pendingPlacements.every((p) => p.initiated_by === 'showroom');
            const offerLinkId = getOfferThreadPlacementId(brandPlacements);

            return (
              <section key={brandId} className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                <div className="p-4 border-b border-neutral-100 bg-neutral-50/50 flex items-center gap-3 flex-wrap">
                  {brand?.avatar_url?.trim() ? (
                    <img src={brand.avatar_url.trim()} alt="" className="w-12 h-12 rounded-full object-cover border border-neutral-200 shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center shrink-0">
                      <Sparkles className="h-6 w-6 text-neutral-600" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-neutral-900">{brand?.brand_name ?? 'Marque'}</h2>
                    <p className="text-sm text-neutral-500">
                      {brandPlacements.length} produit{brandPlacements.length > 1 ? 's' : ''}
                      {offerLinkId && (
                        <>
                          {' · '}
                          <Link href={`/admin/curation/${brandId}`} className="text-neutral-700 hover:underline font-medium">
                            Détail
                          </Link>
                        </>
                      )}
                    </p>
                    {offerLinkId && lastMessageByThreadId[offerLinkId] && (
                      <p className="text-sm text-neutral-600 truncate mt-1">
                        Dernier message : {lastMessageByThreadId[offerLinkId].content.slice(0, 80)}
                        {lastMessageByThreadId[offerLinkId].content.length > 80 ? '…' : ''}
                      </p>
                    )}
                  </div>
                  {totalPlusValue > 0 && (
                    <span className="text-sm font-semibold text-neutral-900 shrink-0">
                      Plus-value potentielle : {totalPlusValue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </span>
                  )}
                  {receivedOffer && (
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => openAcceptModal(brandId, brandPlacements)}
                        disabled={submitting}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-60"
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> Accepter
                      </button>
                      <button
                        type="button"
                        onClick={(e) => refuseOffer(brandId, brandPlacements, e)}
                        disabled={submitting}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs font-medium hover:bg-red-50 disabled:opacity-60"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Refuser
                      </button>
                      <button
                        type="button"
                        onClick={(e) => openCounterModal(brandId, brandPlacements, e)}
                        disabled={submitting}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-neutral-700 text-xs font-medium hover:bg-neutral-50 disabled:opacity-60"
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> Contre-offre
                      </button>
                    </div>
                  )}
                  {myOfferPending && (
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => cancelMyOffer(brandId, brandPlacements, e)}
                        disabled={submitting}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs font-medium hover:bg-red-50 disabled:opacity-60"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Annuler
                      </button>
                      <button
                        type="button"
                        onClick={(e) => openCounterModal(brandId, brandPlacements, e)}
                        disabled={submitting}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-neutral-700 text-xs font-medium hover:bg-neutral-50 disabled:opacity-60"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Modifier
                      </button>
                    </div>
                  )}
                  {offerLinkId && (
                    <button
                      type="button"
                      onClick={() => activeShowroom && openMessenger({ brandId, showroomId: activeShowroom.id, placementId: offerLinkId, title: brand?.brand_name ?? 'Marque', avatarUrl: brand?.avatar_url })}
                      className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800"
                    >
                      <MessageSquare className="h-4 w-4" /> Messagerie
                    </button>
                  )}
                </div>
                <ul className="divide-y divide-neutral-100">
                  {brandPlacements.map((p) => (
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
                      <div className="text-right shrink-0">
                        {getPlusValue(p) != null && (
                          <p className="text-sm font-medium text-neutral-900">
                            {getPlusValue(p)!.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                          </p>
                        )}
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-neutral-200 text-neutral-600 mt-0.5">{getInitiatorBadgeLabel(p.initiated_by, brand?.brand_name, activeShowroom?.name)}</span>
                        <span className="inline-block px-2.5 py-1 rounded-md text-xs font-medium bg-neutral-100 text-neutral-700 mt-0.5">{getStatusDisplayLabel(p.status, p.initiated_by, brand?.brand_name, activeShowroom?.name)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {acceptModal && selectedOffer && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" aria-hidden onClick={() => !submitting && setAcceptModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full pointer-events-auto" role="dialog" aria-modal="true">
              <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-900">Accepter l'offre · {selectedOffer.brandName}</h2>
                <button type="button" onClick={() => !submitting && setAcceptModal(false)} className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100" aria-label="Fermer">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4">
                <p className="text-sm text-neutral-600 mb-4">Indiquez la quantité reçue pour chaque produit.</p>
                <ul className="space-y-3">
                  {selectedOffer.placements.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-4">
                      <span className="font-medium text-neutral-900 truncate">{p.product?.product_name ?? 'Produit'}</span>
                      <input
                        type="number"
                        min={1}
                        value={acceptQuantities[p.id] ?? ''}
                        onChange={(e) => setAcceptQuantities((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        className="w-20 px-3 py-2 rounded-lg border border-neutral-200 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      />
                    </li>
                  ))}
                </ul>
              </div>
              {error && <p className="px-4 text-sm text-red-600">{error}</p>}
              <div className="p-4 border-t border-neutral-200 flex gap-2 justify-end">
                <button type="button" onClick={() => setAcceptModal(false)} disabled={submitting} className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-700 font-medium hover:bg-neutral-50">
                  Annuler
                </button>
                <button type="button" onClick={submitAccept} disabled={submitting} className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-60 flex items-center gap-2">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Valider la réception
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {counterModal && selectedOffer && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" aria-hidden onClick={() => !submitting && setCounterModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto" role="dialog" aria-modal="true">
              <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-900">Contre-offre · {selectedOffer.brandName}</h2>
                <button type="button" onClick={() => !submitting && setCounterModal(false)} className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100" aria-label="Fermer">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 space-y-4">
                <p className="text-sm text-neutral-600">Modifiez quantités et commissions (0 = retirer). Vous pouvez ajouter des produits du catalogue de la marque.</p>
                {selectedOffer.placements.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-neutral-900 mb-2">Produits actuels</h3>
                    <ul className="space-y-3">
                      {selectedOffer.placements.map((p) => (
                        <li key={p.id} className="p-3 rounded-lg border border-neutral-200">
                          <p className="font-medium text-neutral-900 mb-2">{p.product?.product_name ?? 'Produit'}</p>
                          <div className="flex flex-wrap gap-4">
                            <div>
                              <label className="block text-xs text-neutral-500 mb-1">Quantité (0 = retirer)</label>
                              <input
                                type="number"
                                min={0}
                                max={999}
                                value={counterForm[p.id]?.quantity ?? 1}
                                onChange={(e) => setCounterPlacement(p.id, 'quantity', e.target.value === '' ? 0 : Number(e.target.value))}
                                className="w-20 px-2 py-1.5 rounded border border-neutral-200 text-neutral-900"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-neutral-500 mb-1">Commission (%)</label>
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={counterForm[p.id]?.commission ?? ''}
                                onChange={(e) => setCounterPlacement(p.id, 'commission', e.target.value)}
                                className="w-20 px-2 py-1.5 rounded border border-neutral-200 text-neutral-900"
                              />
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-medium text-neutral-900 mb-2 flex items-center gap-1.5">
                    <Plus className="h-4 w-4" /> Ajouter un produit du catalogue
                  </h3>
                  {catalogProducts.length > 0 ? (
                    <ul className="space-y-3">
                      {catalogProducts.map((prod) => (
                        <li key={prod.id} className="p-3 rounded-lg border border-neutral-200">
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={counterAdd[prod.id]?.selected ?? false}
                              onChange={(e) => setCounterAddProduct(prod.id, 'selected', e.target.checked)}
                              className="rounded border-neutral-300 mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-neutral-900">{prod.product_name}</span>
                              {counterAdd[prod.id]?.selected && (
                                <div className="flex flex-wrap gap-3 mt-2">
                                  <div>
                                    <label className="block text-xs text-neutral-500 mb-0.5">Quantité</label>
                                    <input
                                      type="number"
                                      min={1}
                                      max={999}
                                      value={counterAdd[prod.id].quantity}
                                      onChange={(e) => setCounterAddProduct(prod.id, 'quantity', e.target.value === '' ? 1 : Number(e.target.value))}
                                      className="w-16 px-2 py-1 rounded border border-neutral-200 text-neutral-900 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-neutral-500 mb-0.5">Commission (%)</label>
                                    <input
                                      type="number"
                                      min={0}
                                      max={100}
                                      value={counterAdd[prod.id].commission}
                                      onChange={(e) => setCounterAddProduct(prod.id, 'commission', e.target.value)}
                                      className="w-16 px-2 py-1 rounded border border-neutral-200 text-neutral-900 text-sm"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </label>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-neutral-500 py-2">Tous les produits du catalogue sont déjà dans l'offre.</p>
                  )}
                </div>
              </div>
              {error && <p className="px-4 text-sm text-red-600">{error}</p>}
              <div className="p-4 border-t border-neutral-200 flex gap-2 justify-end">
                <button type="button" onClick={() => setCounterModal(false)} disabled={submitting} className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-700 font-medium hover:bg-neutral-50">
                  Annuler
                </button>
                <button type="button" onClick={submitCounterOffer} disabled={submitting} className="px-4 py-2 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 disabled:opacity-60 flex items-center gap-2">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Envoyer la contre-offre
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
          viewerSide="showroom"
          onCandidatureUpdated={(updated) => setDetailCandidature(updated)}
        />
      )}

      {negotiateCandidature && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" aria-hidden onClick={() => !submitting && setNegotiateCandidature(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full pointer-events-auto flex flex-col" role="dialog" aria-modal="true">
              <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {negotiateCandidature.brand?.avatar_url?.trim() ? (
                    <img src={negotiateCandidature.brand.avatar_url.trim()} alt="" className="w-10 h-10 rounded-full object-cover border border-neutral-200 shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                      <Sparkles className="h-5 w-5 text-neutral-400" />
                    </div>
                  )}
                  <h2 className="text-lg font-semibold text-neutral-900 truncate">Négocier avec {negotiateCandidature.brand?.brand_name ?? 'la marque'}</h2>
                </div>
                <button type="button" onClick={() => !submitting && setNegotiateCandidature(null)} className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 shrink-0" aria-label="Fermer">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4">
                <label className="block text-sm font-medium text-neutral-900 mb-1">Votre message (contre-proposition, questions…)</label>
                <textarea
                  value={negotiateMessage}
                  onChange={(e) => setNegotiateMessage(e.target.value)}
                  placeholder="Écrivez votre message…"
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none"
                />
              </div>
              <div className="p-4 border-t border-neutral-200 flex gap-2 justify-end">
                <button type="button" onClick={() => setNegotiateCandidature(null)} disabled={submitting} className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-700 font-medium hover:bg-neutral-50">
                  Annuler
                </button>
                <button type="button" onClick={sendNegotiateMessage} disabled={submitting || !negotiateMessage.trim()} className="px-4 py-2 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-2">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Envoyer
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
