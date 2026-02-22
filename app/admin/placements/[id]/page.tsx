'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAdminEntity } from '../../context/AdminEntityContext';
import {
  ArrowLeft,
  Loader2,
  Send,
  Package,
  Store,
  Sparkles,
  CheckCircle,
  ShoppingBag,
  XCircle,
  MessageSquare,
  X,
  Plus,
  Pencil,
} from 'lucide-react';
import type { Placement, Product, Showroom, Brand, Message } from '@/lib/supabase';
import { getOrCreateConversationId } from '@/lib/conversations';
import { getStatusDisplayLabel, getInitiatorBadgeLabel } from '@/lib/placements';

type PlacementWithProduct = Placement & { product?: Product };

type UnifiedMessage = {
  source: 'conversation';
  id: string;
  sender_id: string;
  content: string;
  created_at: string | null;
  sender_role: 'brand' | 'boutique' | null;
  message_type: string | null;
  placement_id?: string | null;
};

export default function PlacementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const placementId = params?.id as string | undefined;
  const { userId, activeBrand, activeShowroom, entityType } = useAdminEntity();

  const [offerPlacements, setOfferPlacements] = useState<PlacementWithProduct[]>([]);
  const [showroom, setShowroom] = useState<Showroom | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [threadPlacementId, setThreadPlacementId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [allMessages, setAllMessages] = useState<UnifiedMessage[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageBody, setMessageBody] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [acceptModal, setAcceptModal] = useState(false);
  const [counterModal, setCounterModal] = useState(false);
  const [acceptQuantities, setAcceptQuantities] = useState<Record<string, string>>({});
  const [counterForm, setCounterForm] = useState<Record<string, { quantity: number; commission: string }>>({});
  const [counterAdd, setCounterAdd] = useState<Record<number, { selected: boolean; quantity: number; commission: string }>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const firstPlacement = offerPlacements[0];
  const showroomId = firstPlacement?.showroom_id ?? 0;
  const brandId = firstPlacement?.product?.brand_id ?? 0;
  const isBrandSide = activeBrand && brandId === activeBrand.id;
  const isShowroomSide = activeShowroom && showroomId === activeShowroom.id;
  const canAccess = isBrandSide || isShowroomSide;

  const pendingPlacements = offerPlacements.filter((p) => (p.status ?? 'pending') === 'pending');
  const hasPending = pendingPlacements.length > 0;
  /** J'ai reçu une offre de l'autre partie (en attente de ma réponse) → Accepter, Refuser, Contre-offre */
  const receivedOffer =
    hasPending &&
    pendingPlacements.some(
      (p) => (p.initiated_by === 'showroom' && isBrandSide) || (p.initiated_by === 'brand' && isShowroomSide)
    );
  /** Mon offre est en attente chez l'autre partie → Annuler, Modifier */
  const myOfferPending =
    hasPending &&
    pendingPlacements.every(
      (p) => (p.initiated_by === 'brand' && isBrandSide) || (p.initiated_by === 'showroom' && isShowroomSide)
    );
  const myPendingIds = hasPending
    ? pendingPlacements
        .filter(
          (p) => (isBrandSide && p.initiated_by === 'brand') || (isShowroomSide && p.initiated_by === 'showroom')
        )
        .map((p) => p.id)
    : [];

  const loadOffer = useCallback(async () => {
    if (!placementId) return false;
    const { data: p, error: e } = await supabase.from('placements').select('*').eq('id', placementId).single();
    if (e || !p) {
      setError(e?.message ?? 'Placement introuvable');
      setOfferPlacements([]);
      return false;
    }
    const pl = p as Placement;
    const [{ data: prod }, { data: sh }] = await Promise.all([
      supabase.from('products').select('*').eq('id', pl.product_id).single(),
      supabase.from('showrooms').select('*').eq('id', pl.showroom_id).single(),
    ]);
    const product = prod as Product | null;
    if (!product?.brand_id) {
      setError('Produit ou marque introuvable.');
      return false;
    }
    setShowroom((sh as Showroom) ?? null);
    const { data: b } = await supabase.from('brands').select('*').eq('id', product.brand_id).single();
    setBrand((b as Brand) ?? null);

    const { data: productsData } = await supabase.from('products').select('id').eq('brand_id', product.brand_id);
    const productIds = ((productsData as { id: number }[]) ?? []).map((x) => x.id);
    if (productIds.length === 0) return false;

    const { data: placementsData } = await supabase
      .from('placements')
      .select('*')
      .eq('showroom_id', pl.showroom_id)
      .in('product_id', productIds)
      .order('created_at', { ascending: true });
    const list = (placementsData as Placement[]) ?? [];
    const { data: productsFull } = await supabase.from('products').select('id, product_name, brand_id, price, image_url, commission_percent').in('id', productIds);
    const productMap = Object.fromEntries(((productsFull as Product[]) ?? []).map((x) => [x.id, x]));
    const withDetails = list.map((x) => ({ ...x, product: productMap[x.product_id] }));
    setOfferPlacements(withDetails);

    const threadId = list.length > 0 ? list[0].id : placementId;
    setThreadPlacementId(threadId);
    setError(null);

    const bid = product.brand_id;
    const sid = pl.showroom_id;
    const placementIds = list.map((x) => x.id);
    const conversationId = await getOrCreateConversationId(bid, sid);

    const { data: convMsgs } = conversationId
      ? await supabase.from('messages').select('id, sender_id, sender_role, content, created_at, message_type, placement_id').eq('conversation_id', conversationId).order('created_at', { ascending: true })
      : { data: [] as Message[] };

    const unified: UnifiedMessage[] = ((convMsgs as Message[]) ?? []).map((m) => ({
      source: 'conversation' as const,
      id: m.id,
      sender_id: m.sender_id,
      content: m.content,
      created_at: m.created_at,
      sender_role: m.sender_role ?? null,
      message_type: m.message_type ?? null,
      placement_id: m.placement_id ?? null,
    }));
    unified.sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());
    setAllMessages(unified);
    setMessages((convMsgs as Message[]) ?? []);

    const placedIds = new Set(list.map((x) => x.product_id));
    setCatalogProducts(((productsFull as Product[]) ?? []).filter((x) => !placedIds.has(x.id)));
    return true;
  }, [placementId]);

  useEffect(() => {
    if (!placementId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadOffer().then(() => setLoading(false));
  }, [placementId, loadOffer]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && placementId && isShowroomSide && offerPlacements.length > 0) {
        loadOffer().then((ok) => {
          if (!ok) router.replace('/admin/curation');
        });
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadOffer, placementId, isShowroomSide, router, offerPlacements.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !messageBody.trim() || sendingMessage || !brandId || !showroomId) return;
    const senderRole: 'brand' | 'boutique' = entityType === 'showroom' ? 'boutique' : 'brand';
    const conversationId = await getOrCreateConversationId(brandId, showroomId);
    if (!conversationId) return;
    setSendingMessage(true);
    setError(null);
    try {
      const { error: err } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: userId,
        sender_role: senderRole,
        content: messageBody.trim(),
        is_read: false,
      });
      if (err) {
        setError(err.message);
        return;
      }
      const { data } = await supabase.from('messages').select('id, sender_id, sender_role, content, created_at, message_type, placement_id').eq('conversation_id', conversationId).order('created_at', { ascending: true });
      const convList = (data as Message[]) ?? [];
      setAllMessages((prev) => {
        const rest = prev.filter((m) => m.source !== 'conversation');
        const next = [...rest, ...convList.map((m) => ({ source: 'conversation' as const, id: m.id, sender_id: m.sender_id, content: m.content, created_at: m.created_at, sender_role: m.sender_role ?? null, message_type: m.message_type ?? null, placement_id: m.placement_id ?? null }))];
        next.sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());
        return next;
      });
      setMessageBody('');
    } finally {
      setSendingMessage(false);
    }
  }

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
    setUpdating(true);
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
      if (threadPlacementId && userId && brandId && showroomId) {
        const cid = await getOrCreateConversationId(brandId, showroomId);
        if (cid) {
          const senderRole: 'brand' | 'boutique' = entityType === 'showroom' ? 'boutique' : 'brand';
          await supabase.from('messages').insert({
            conversation_id: cid,
            sender_id: userId,
            sender_role: senderRole,
            content: `[Modification] La boutique ${showroom?.name ?? 'La boutique'} a accepté l'offre.`,
            message_type: 'placement_action',
            placement_id: threadPlacementId,
            is_read: false,
          });
        }
      }
      setAcceptModal(false);
      await loadOffer();
      router.refresh();
    } finally {
      setUpdating(false);
    }
  }

  /** Refuser l'offre reçue de l'autre partie */
  async function refuseTheirOffer() {
    if (!receivedOffer) return;
    if (!confirm(`Refuser l'offre reçue ? Les ${pendingPlacements.length} produit(s) en attente seront annulés.`)) return;
    setUpdating(true);
    setError(null);
    try {
      const ids = pendingPlacements.map((p) => p.id);
      if (threadPlacementId && brand && userId && brandId && showroomId) {
        const cid = await getOrCreateConversationId(brandId, showroomId);
        if (cid) {
          const senderRole: 'brand' | 'boutique' = entityType === 'showroom' ? 'boutique' : 'brand';
          await supabase.from('messages').insert({
            conversation_id: cid,
            sender_id: userId,
            sender_role: senderRole,
            content: `[Modification] ${isBrandSide ? `La marque ${brand.brand_name}` : `La boutique ${showroom?.name ?? 'La boutique'}`} a refusé l'offre.`,
            message_type: 'placement_action',
            placement_id: threadPlacementId,
            is_read: false,
          });
        }
      }
      await supabase.from('placements').delete().in('id', ids);
      router.push(isBrandSide ? '/admin/placements' : '/admin/curation');
    } finally {
      setUpdating(false);
    }
  }

  /** Annuler mon offre (demande en attente chez l'autre partie) */
  async function cancelMyOffer() {
    if (myPendingIds.length === 0) return;
    if (!confirm(`Annuler votre offre ? Les ${myPendingIds.length} produit(s) que vous avez proposés seront retirés.`)) return;
    setUpdating(true);
    setError(null);
    try {
      if (threadPlacementId && brand && userId && brandId && showroomId) {
        const cid = await getOrCreateConversationId(brandId, showroomId);
        if (cid) {
          const senderRole: 'brand' | 'boutique' = entityType === 'showroom' ? 'boutique' : 'brand';
          await supabase.from('messages').insert({
            conversation_id: cid,
            sender_id: userId,
            sender_role: senderRole,
            content: `[Modification] ${isBrandSide ? `La marque ${brand.brand_name}` : `La boutique ${showroom?.name ?? 'La boutique'}`} a annulé son offre.`,
            message_type: 'placement_action',
            placement_id: threadPlacementId,
            is_read: false,
          });
        }
      }
      await supabase.from('placements').delete().in('id', myPendingIds);
      const wasOnlyMyPlacements = myPendingIds.length === offerPlacements.length;
      await loadOffer();
      if (wasOnlyMyPlacements) router.push(isBrandSide ? '/admin/placements' : '/admin/curation');
      else router.refresh();
    } finally {
      setUpdating(false);
    }
  }

  function openCounterModal() {
    const form: Record<string, { quantity: number; commission: string }> = {};
    offerPlacements.forEach((p) => {
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
        commission: prod.commission_percent != null ? String(prod.commission_percent) : String(activeShowroom?.default_commission_rate ?? activeBrand?.default_commission_rate ?? 20),
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
    if (!userId || !threadPlacementId) return;
    const brandName = brand?.brand_name ?? 'La marque';
    const showroomName = showroom?.name ?? 'La boutique';
    setUpdating(true);
    setError(null);
    try {
      for (const p of offerPlacements) {
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
      const sid = showroom?.id ?? activeShowroom?.id;
      if (sid) {
        for (const prod of toAdd) {
          const cfg = counterAdd[prod.id];
          const qty = cfg.quantity ?? 1;
          const rate = cfg.commission.trim() ? parseInt(cfg.commission, 10) : null;
          await supabase.from('placements').insert({
            product_id: prod.id,
            showroom_id: sid,
            status: 'pending',
            stock_quantity: qty,
            agreed_commission_rate: rate != null && !Number.isNaN(rate) ? rate : null,
            initiated_by: isShowroomSide ? 'showroom' : 'brand',
          });
        }
      }
      const msgBody = isBrandSide
        ? `[Modification] La marque ${brandName} a envoyé une contre-offre : modification des conditions.`
        : `[Modification] La boutique ${showroomName} a envoyé une contre-offre : modification des quantités et commissions.${toAdd.length > 0 ? ` ${toAdd.length} nouveau(x) produit(s) proposé(s).` : ''}`;
      if (userId && threadPlacementId && brandId && showroomId) {
        const cid = await getOrCreateConversationId(brandId, showroomId);
        if (cid) {
          const senderRole: 'brand' | 'boutique' = entityType === 'showroom' ? 'boutique' : 'brand';
          await supabase.from('messages').insert({
            conversation_id: cid,
            sender_id: userId,
            sender_role: senderRole,
            content: msgBody,
            message_type: 'placement_action',
            placement_id: threadPlacementId,
            is_read: false,
          });
        }
      }
      setCounterModal(false);
      await loadOffer();
      router.refresh();
    } finally {
      setUpdating(false);
    }
  }

  async function declareSale(pl: PlacementWithProduct) {
    if (!isShowroomSide || pl.status !== 'active') return;
    const current = pl.stock_quantity ?? 0;
    if (current < 1) {
      setError('Plus de stock à déclarer.');
      return;
    }
    setUpdating(true);
    setError(null);
    try {
      const newStock = current - 1;
      const { error: err } = await supabase
        .from('placements')
        .update({ stock_quantity: newStock, status: newStock === 0 ? 'sold' : 'active' })
        .eq('id', pl.id);
      if (err) setError(err.message);
      else await loadOffer();
      router.refresh();
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (offerPlacements.length === 0 || !canAccess) {
    return (
      <div className="max-w-md mx-auto py-8 text-center">
        <p className="text-neutral-600">Offre introuvable ou accès non autorisé.</p>
        <Link href={entityType === 'showroom' ? '/admin/curation' : '/admin/placements'} className="mt-4 inline-block text-sm font-medium text-neutral-900 hover:underline">
          <ArrowLeft className="inline h-4 w-4 mr-1" /> Retour
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <Link
          href={entityType === 'showroom' ? '/admin/curation' : '/admin/placements'}
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
        {isShowroomSide && brandId > 0 && (
          <Link href={`/admin/curation/${brandId}`} className="text-sm font-medium text-neutral-700 hover:text-neutral-900 underline">
            Conversation · {brand?.brand_name ?? 'Marque'}
          </Link>
        )}
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden mb-6">
        <div className="p-4 border-b border-neutral-100 bg-neutral-50/50">
          <div className="flex items-center gap-3">
            {brand?.avatar_url?.trim() ? (
              <img src={brand.avatar_url.trim()} alt="" className="w-12 h-12 rounded-full object-cover border border-neutral-200 shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                <Sparkles className="h-6 w-6 text-neutral-400" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold text-neutral-900">Négociation · {brand?.brand_name ?? 'Marque'}</h1>
              {showroom && (
                <p className="text-sm text-neutral-600 mt-1 flex items-center gap-2">
                  {showroom.avatar_url?.trim() ? (
                    <img src={showroom.avatar_url.trim()} alt="" className="w-5 h-5 rounded-full object-cover border border-neutral-200 shrink-0" />
                  ) : (
                    <Store className="h-4 w-4 shrink-0" />
                  )}
                  {showroom.name} {showroom.city && ` · ${showroom.city}`}
                </p>
              )}
            </div>
          </div>
          <p className="text-sm text-neutral-500 mt-1">Historique des échanges et messages. Envoyez un message à tout moment de l’offre.</p>
        </div>

        <ul className="divide-y divide-neutral-100">
          {offerPlacements.map((p) => (
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
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-neutral-200 text-neutral-600 shrink-0">{getInitiatorBadgeLabel(p.initiated_by, brand?.brand_name, showroom?.name)}</span>
              <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-neutral-100 text-neutral-700 shrink-0">{getStatusDisplayLabel(p.status, p.initiated_by, brand?.brand_name, showroom?.name)}</span>
              {isShowroomSide && p.status === 'active' && (p.stock_quantity ?? 0) > 0 && (
                <button
                  type="button"
                  onClick={() => declareSale(p)}
                  disabled={updating}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800 disabled:opacity-60"
                >
                  <ShoppingBag className="h-3.5 w-3.5" /> Déclarer une vente
                </button>
              )}
            </li>
          ))}
        </ul>

        {receivedOffer && (
          <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex flex-wrap gap-2">
            <p className="w-full text-sm text-neutral-600 mb-1">Vous avez reçu une offre. Répondez :</p>
            {isShowroomSide && (
              <button
                type="button"
                onClick={openAcceptModal}
                disabled={updating}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60"
              >
                <CheckCircle className="h-4 w-4" /> Accepter
              </button>
            )}
            <button
              type="button"
              onClick={refuseTheirOffer}
              disabled={updating}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-700 text-sm font-medium hover:bg-red-50 disabled:opacity-60"
            >
              <XCircle className="h-4 w-4" /> Refuser
            </button>
            <button
              type="button"
              onClick={openCounterModal}
              disabled={updating}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-200 text-neutral-700 text-sm font-medium hover:bg-neutral-50 disabled:opacity-60"
            >
              <MessageSquare className="h-4 w-4" /> Contre-offre
            </button>
          </div>
        )}
        {myOfferPending && (
          <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex flex-wrap gap-2">
            <p className="w-full text-sm text-neutral-600 mb-1">Votre offre est en attente chez {isBrandSide ? (showroom?.name ?? 'la boutique') : (brand?.brand_name ?? 'la marque')}.</p>
            <button
              type="button"
              onClick={cancelMyOffer}
              disabled={updating}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-700 text-sm font-medium hover:bg-red-50 disabled:opacity-60"
            >
              <XCircle className="h-4 w-4" /> Annuler
            </button>
            <button
              type="button"
              onClick={openCounterModal}
              disabled={updating}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-200 text-neutral-700 text-sm font-medium hover:bg-neutral-50 disabled:opacity-60"
            >
              <Pencil className="h-4 w-4" /> Modifier
            </button>
          </div>
        )}
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white">
        <h2 className="p-4 border-b border-neutral-100 text-sm font-semibold text-neutral-900">Historique des échanges</h2>
        <div className="p-4 max-h-[400px] overflow-y-auto space-y-3">
          {allMessages.length === 0 && <p className="text-sm text-neutral-500">Aucun message. Envoyez un message ou négociez les conditions ci-dessus.</p>}
          {allMessages.map((m) => {
            const content = m.content;
            if (m.source === 'conversation' && 'message_type' in m && m.message_type && m.message_type !== 'chat') {
              return (
                <div key={`${m.source}-${m.id}`} className="flex justify-center my-2">
                  <span className="bg-gray-100 text-gray-500 text-xs py-1 px-3 rounded-full text-center">
                    {content}
                  </span>
                </div>
              );
            }
            const isModification = content.startsWith('[Modification]') || (content.startsWith('[') && content.includes(']'));
            const isMe =
              m.source === 'conversation' && 'sender_role' in m && (m.sender_role === 'brand' || m.sender_role === 'boutique')
                ? (entityType === 'showroom' ? m.sender_role === 'boutique' : m.sender_role === 'brand')
                : m.sender_id === userId;
            const senderName = m.sender_id === brand?.owner_id ? brand?.brand_name : m.sender_id === showroom?.owner_id ? showroom?.name : 'Utilisateur';
            const uniqKey = `${m.source}-${m.id}`;
            if (isModification) {
              return (
                <div key={uniqKey} className="flex justify-center">
                  <div className="max-w-[90%] rounded-lg px-3 py-2 text-sm bg-neutral-100 border border-neutral-200 border-dashed">
                    <p className="text-xs text-neutral-500 italic">{content.replace(/^\[Modification\]\s*/, '')}</p>
                    <p className="text-xs text-neutral-400 mt-1">{m.created_at ? new Date(m.created_at).toLocaleString('fr-FR') : ''}</p>
                  </div>
                </div>
              );
            }
            return (
              <div key={uniqKey} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${isMe ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-900'}`}>
                  <p className="text-xs font-medium opacity-90">{senderName}</p>
                  <p className="whitespace-pre-wrap mt-0.5">{m.content}</p>
                  <p className={`text-xs mt-1 ${isMe ? 'text-neutral-300' : 'text-neutral-500'}`}>{m.created_at ? new Date(m.created_at).toLocaleString('fr-FR') : ''}</p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={sendMessage} className="p-4 border-t border-neutral-100 flex gap-2">
          <input
            type="text"
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            placeholder="Écrire un message…"
            className="flex-1 px-4 py-2.5 rounded-lg border border-neutral-200 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
          <button type="submit" disabled={sendingMessage || !messageBody.trim()} className="px-4 py-2.5 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-2">
            {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Envoyer
          </button>
        </form>
      </section>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {acceptModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" aria-hidden onClick={() => !updating && setAcceptModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full pointer-events-auto" role="dialog" aria-modal="true">
              <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-900">Accepter l'offre</h2>
                <button type="button" onClick={() => !updating && setAcceptModal(false)} className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100" aria-label="Fermer">
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
                <button type="button" onClick={() => setAcceptModal(false)} disabled={updating} className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-700 font-medium hover:bg-neutral-50">
                  Annuler
                </button>
                <button type="button" onClick={submitAccept} disabled={updating} className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-60 flex items-center gap-2">
                  {updating && <Loader2 className="h-4 w-4 animate-spin" />} Valider la réception
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {counterModal && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" aria-hidden onClick={() => !updating && setCounterModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto" role="dialog" aria-modal="true">
              <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-900">Contre-offre</h2>
                <button type="button" onClick={() => !updating && setCounterModal(false)} className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100" aria-label="Fermer">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 space-y-4">
                <p className="text-sm text-neutral-600">Modifiez quantités et commissions (0 = retirer du deal). Vous pouvez aussi ajouter un ou plusieurs produits du catalogue de la marque.</p>
                {offerPlacements.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-neutral-900 mb-2">Produits actuels</h3>
                    <ul className="space-y-3">
                      {offerPlacements.map((p) => (
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
                    <Plus className="h-4 w-4" /> Ajouter un produit du catalogue de la marque
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
                    <p className="text-sm text-neutral-500 py-2">Tous les produits du catalogue de la marque sont déjà dans l'offre. Aucun produit à ajouter.</p>
                  )}
                </div>
              </div>
              {error && <p className="px-4 text-sm text-red-600">{error}</p>}
              <div className="p-4 border-t border-neutral-200 flex gap-2 justify-end">
                <button type="button" onClick={() => setCounterModal(false)} disabled={updating} className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-700 font-medium hover:bg-neutral-50">
                  Annuler
                </button>
                <button type="button" onClick={submitCounterOffer} disabled={updating} className="px-4 py-2 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 disabled:opacity-60 flex items-center gap-2">
                  {updating && <Loader2 className="h-4 w-4 animate-spin" />} Envoyer la contre-offre
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
