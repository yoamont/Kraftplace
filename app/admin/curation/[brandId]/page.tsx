'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAdminEntity } from '../../context/AdminEntityContext';
import {
  Loader2,
  Package,
  Sparkles,
  ArrowLeft,
  MessageSquare,
  RefreshCw,
  CheckCircle,
  XCircle,
  Pencil,
  X,
  Plus,
} from 'lucide-react';
import type { Placement, Product, Brand } from '@/lib/supabase';
import { getOrCreateConversationId } from '@/lib/conversations';
import { getStatusDisplayLabel, getInitiatorBadgeLabel } from '@/lib/placements';

type PlacementWithDetails = Placement & { product?: Product };

function plusValuePotentielle(qty: number, price: number, rate: number): number {
  return qty * price * (rate / 100);
}

/** ID du premier placement (plus ancien) = fil de messages */
function getOfferThreadPlacementId(placements: PlacementWithDetails[]): string | null {
  if (placements.length === 0) return null;
  const sorted = [...placements].sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());
  return sorted[0].id;
}

export default function CurationBrandPage() {
  const params = useParams();
  const router = useRouter();
  const brandIdParam = params?.brandId as string | undefined;
  const brandId = brandIdParam ? parseInt(brandIdParam, 10) : null;
  const { entityType, activeShowroom, userId } = useAdminEntity();

  const [brand, setBrand] = useState<Brand | null>(null);
  const [placements, setPlacements] = useState<PlacementWithDetails[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptModal, setAcceptModal] = useState(false);
  const [counterModal, setCounterModal] = useState(false);
  const [acceptQuantities, setAcceptQuantities] = useState<Record<string, string>>({});
  const [counterForm, setCounterForm] = useState<Record<string, { quantity: number; commission: string }>>({});
  const [counterAdd, setCounterAdd] = useState<Record<number, { selected: boolean; quantity: number; commission: string }>>({});

  const loadDemand = useCallback(async () => {
    if (entityType !== 'showroom' || !activeShowroom || brandId == null || Number.isNaN(brandId)) return;
    const { data: brandData } = await supabase.from('brands').select('*').eq('id', brandId).single();
    setBrand((brandData as Brand) ?? null);

    const { data: productsData } = await supabase.from('products').select('id').eq('brand_id', brandId);
    const productIds = ((productsData as { id: number }[]) ?? []).map((p) => p.id);
    if (productIds.length === 0) {
      setPlacements([]);
      setCatalogProducts([]);
      return;
    }

    const { data: placementsData } = await supabase
      .from('placements')
      .select('*')
      .eq('showroom_id', activeShowroom.id)
      .in('product_id', productIds)
      .order('created_at', { ascending: false });
    const list = (placementsData as Placement[]) ?? [];

    const { data: productsFull } = await supabase.from('products').select('id, product_name, brand_id, price, image_url, commission_percent').in('id', productIds);
    const productMap = Object.fromEntries(((productsFull as Product[]) ?? []).map((p) => [p.id, p]));
    setPlacements(list.map((p) => ({ ...p, product: productMap[p.product_id] })));

    const placedIds = new Set(list.map((p) => p.product_id));
    setCatalogProducts(((productsFull as Product[]) ?? []).filter((p) => !placedIds.has(p.id)));
  }, [entityType, activeShowroom?.id, brandId]);

  useEffect(() => {
    if (entityType !== 'showroom' || !activeShowroom || brandId == null || Number.isNaN(brandId)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadDemand().finally(() => setLoading(false));
  }, [loadDemand, entityType, activeShowroom, brandId]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && entityType === 'showroom' && activeShowroom && brandId != null) {
        setRefreshing(true);
        loadDemand().finally(() => setRefreshing(false));
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadDemand, entityType, activeShowroom, brandId]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadDemand();
    setRefreshing(false);
  }

  useEffect(() => {
    if (!loading && brand != null && placements.length === 0) {
      router.replace('/admin/curation');
    }
  }, [loading, brand, placements.length, router]);

  const pendingPlacements = placements.filter((p) => (p.status ?? 'pending') === 'pending');
  const hasPending = pendingPlacements.length > 0;
  const receivedOffer = hasPending && pendingPlacements.some((p) => p.initiated_by === 'brand');
  const myOfferPending = hasPending && pendingPlacements.every((p) => p.initiated_by === 'showroom');
  const myPendingIds = hasPending ? pendingPlacements.filter((p) => p.initiated_by === 'showroom').map((p) => p.id) : [];
  const threadPlacementId = getOfferThreadPlacementId(placements);

  function openAcceptModal() {
    const qty: Record<string, string> = {};
    pendingPlacements.forEach((p) => {
      qty[p.id] = String(p.stock_quantity ?? 1);
    });
    setAcceptQuantities(qty);
    setAcceptModal(true);
    setError(null);
  }

  async function submitAccept() {
    if (!activeShowroom) return;
    for (const p of pendingPlacements) {
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
      for (const p of pendingPlacements) {
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
      setAcceptModal(false);
      await loadDemand();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function refuseTheirOffer() {
    if (!receivedOffer) return;
    if (!confirm(`Refuser l'offre reçue ? Les ${pendingPlacements.length} produit(s) en attente seront annulés.`)) return;
    setSubmitting(true);
    setError(null);
    try {
      const ids = pendingPlacements.map((p) => p.id);
      if (threadPlacementId && brand && userId && brandId != null && activeShowroom) {
        const cid = await getOrCreateConversationId(brandId, activeShowroom.id);
        if (cid) {
          await supabase.from('messages').insert({
            conversation_id: cid,
            sender_id: userId,
            sender_role: 'boutique',
            content: `[Modification] La boutique ${activeShowroom?.name ?? 'La boutique'} a refusé l'offre.`,
            message_type: 'placement_action',
            placement_id: threadPlacementId,
            is_read: false,
          });
        }
      }
      await supabase.from('placements').delete().in('id', ids);
      router.push('/admin/curation');
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelMyOffer() {
    if (myPendingIds.length === 0) return;
    if (!confirm(`Annuler votre offre ? Les ${myPendingIds.length} produit(s) que vous avez proposés seront retirés.`)) return;
    setSubmitting(true);
    setError(null);
    try {
      if (threadPlacementId && brand && userId && brandId != null && activeShowroom) {
        const cid = await getOrCreateConversationId(brandId, activeShowroom.id);
        if (cid) {
          await supabase.from('messages').insert({
            conversation_id: cid,
            sender_id: userId,
            sender_role: 'boutique',
            content: `[Modification] La boutique ${activeShowroom?.name ?? 'La boutique'} a annulé son offre.`,
            message_type: 'placement_action',
            placement_id: threadPlacementId,
            is_read: false,
          });
        }
      }
      await supabase.from('placements').delete().in('id', myPendingIds);
      const noPlacementsLeft = placements.length === myPendingIds.length;
      await loadDemand();
      if (noPlacementsLeft) router.push('/admin/curation');
      else router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  function openCounterModal() {
    const form: Record<string, { quantity: number; commission: string }> = {};
    placements.forEach((p) => {
      form[p.id] = {
        quantity: p.stock_quantity ?? 1,
        commission: p.agreed_commission_rate != null ? String(p.agreed_commission_rate) : '',
      };
    });
    setCounterForm(form);
    const add: Record<number, { selected: boolean; quantity: number; commission: string }> = {};
    catalogProducts.forEach((prod) => {
      add[prod.id] = {
        selected: false,
        quantity: 1,
        commission: prod.commission_percent != null ? String(prod.commission_percent) : String(activeShowroom?.default_commission_rate ?? 20),
      };
    });
    setCounterAdd(add);
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
    if (!activeShowroom || !userId || !threadPlacementId) return;
    setSubmitting(true);
    setError(null);
    try {
      for (const p of placements) {
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
      if (brandId != null) {
        const cid = await getOrCreateConversationId(brandId, activeShowroom.id);
        if (cid) {
          await supabase.from('messages').insert({
            conversation_id: cid,
            sender_id: userId,
            sender_role: 'boutique',
            content: `[Modification] Le showroom ${showroomName} a envoyé une contre-offre : modification des quantités et commissions.${toAdd.length > 0 ? ` ${toAdd.length} nouveau(x) produit(s) proposé(s).` : ''}`,
            message_type: 'placement_action',
            placement_id: threadPlacementId,
            is_read: false,
          });
        }
      }
      setCounterModal(false);
      await loadDemand();
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

  if (entityType !== 'showroom' || !activeShowroom || brandId == null || !brand) {
    return (
      <div className="max-w-md mx-auto py-8 text-center">
        <p className="text-neutral-600">Conversation introuvable.</p>
        <Link href="/admin/curation" className="mt-4 inline-block text-sm font-medium text-neutral-900 hover:underline">
          Retour à la messagerie
        </Link>
      </div>
    );
  }

  const totalPlusValue = placements.reduce((sum, p) => {
    const qty = p.stock_quantity ?? 1;
    const price = p.product?.price ?? 0;
    const rate = p.agreed_commission_rate ?? activeShowroom.default_commission_rate ?? 0;
    return sum + (price && rate != null ? plusValuePotentielle(qty, price, rate) : 0);
  }, 0);

  const offerLinkId = getOfferThreadPlacementId(placements);

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/admin/curation" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 mb-6">
        <ArrowLeft className="h-4 w-4" /> Messagerie
      </Link>

      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden mb-6">
        <div className="p-4 border-b border-neutral-100 bg-neutral-50/50 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            {brand.avatar_url?.trim() ? (
              <img src={brand.avatar_url.trim()} alt="" className="w-12 h-12 rounded-full object-cover border border-neutral-200 shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                <Sparkles className="h-6 w-6 text-neutral-400" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-semibold text-neutral-900">Conversation · {brand.brand_name}</h1>
            {totalPlusValue > 0 && (
              <p className="text-sm font-medium text-neutral-900 mt-1">Plus-value potentielle : {totalPlusValue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
            )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Rafraîchir
            </button>
            {offerLinkId && (
              <Link
                href={`/admin/placements/${offerLinkId}`}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                <MessageSquare className="h-4 w-4" /> Voir les messages
              </Link>
            )}
          </div>
        </div>
        <ul className="divide-y divide-neutral-100">
          {placements.map((p) => (
            <li key={p.id} className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center overflow-hidden shrink-0">
                {p.product?.image_url ? <img src={p.product.image_url} alt="" className="w-full h-full object-cover" /> : <Package className="h-6 w-6 text-neutral-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-neutral-900 truncate">{p.product?.product_name ?? 'Produit'}</p>
                <p className="text-sm text-neutral-500">
                  {p.stock_quantity != null && p.stock_quantity > 0 && `${p.stock_quantity} pièce(s)`}
                  {p.agreed_commission_rate != null && ` · ${p.agreed_commission_rate} %`}
                </p>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-neutral-200 text-neutral-600">{getInitiatorBadgeLabel(p.initiated_by, brand?.brand_name, activeShowroom?.name)}</span>
              <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-neutral-100 text-neutral-700">{getStatusDisplayLabel(p.status, p.initiated_by, brand?.brand_name, activeShowroom?.name)}</span>
            </li>
          ))}
        </ul>

        {receivedOffer && (
          <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex flex-wrap gap-2">
            <p className="w-full text-sm text-neutral-600 mb-1">Vous avez reçu une offre de la marque.</p>
            <button
              type="button"
              onClick={openAcceptModal}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60"
            >
              <CheckCircle className="h-4 w-4" /> Accepter
            </button>
            <button
              type="button"
              onClick={refuseTheirOffer}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-700 text-sm font-medium hover:bg-red-50 disabled:opacity-60"
            >
              <XCircle className="h-4 w-4" /> Refuser
            </button>
            <button
              type="button"
              onClick={openCounterModal}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-200 text-neutral-700 text-sm font-medium hover:bg-neutral-50 disabled:opacity-60"
            >
              <MessageSquare className="h-4 w-4" /> Contre-offre
            </button>
          </div>
        )}
        {myOfferPending && (
          <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex flex-wrap gap-2">
            <p className="w-full text-sm text-neutral-600 mb-1">Votre offre est en attente chez {brand.brand_name}.</p>
            <button
              type="button"
              onClick={cancelMyOffer}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-700 text-sm font-medium hover:bg-red-50 disabled:opacity-60"
            >
              <XCircle className="h-4 w-4" /> Annuler
            </button>
            <button
              type="button"
              onClick={openCounterModal}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-200 text-neutral-700 text-sm font-medium hover:bg-neutral-50 disabled:opacity-60"
            >
              <Pencil className="h-4 w-4" /> Modifier
            </button>
          </div>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {acceptModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" aria-hidden onClick={() => !submitting && setAcceptModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full pointer-events-auto" role="dialog" aria-modal="true">
              <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-900">Accepter l'offre</h2>
                <button type="button" onClick={() => !submitting && setAcceptModal(false)} className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100" aria-label="Fermer">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4">
                <p className="text-sm text-neutral-600 mb-4">Indiquez la quantité reçue pour chaque produit.</p>
                <ul className="space-y-3">
                  {pendingPlacements.map((p) => (
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

      {counterModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" aria-hidden onClick={() => !submitting && setCounterModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto" role="dialog" aria-modal="true">
              <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-900">Contre-offre</h2>
                <button type="button" onClick={() => !submitting && setCounterModal(false)} className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100" aria-label="Fermer">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 space-y-4">
                <p className="text-sm text-neutral-600">Modifiez quantités et commissions (0 = retirer). Vous pouvez ajouter des produits du catalogue de la marque.</p>
                {placements.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-neutral-900 mb-2">Produits actuels</h3>
                    <ul className="space-y-3">
                      {placements.map((p) => (
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
    </div>
  );
}
