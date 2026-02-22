'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getOrCreateConversationId } from '@/lib/conversations';
import { useAdminEntity } from '../context/AdminEntityContext';
import { useMessengerPanel } from '../context/MessengerPanelContext';
import { Loader2, Send, X, Minus, MessageSquare, CheckCircle, XCircle, RefreshCw, FileText } from 'lucide-react';
import type { Showroom, Brand, Message } from '@/lib/supabase';

type UnifiedMessage = {
  source: 'conversation';
  id: string;
  sender_id: string;
  content: string;
  created_at: string | null;
  sender_role: 'brand' | 'boutique' | null;
  message_type?: string | null;
  placement_id?: string | null;
};

const PANEL_WIDTH = 420;
const LAST_READ_KEY = (brandId: number, showroomId: number) => `messenger-lastread-${brandId}-${showroomId}`;

function getUnreadCount(messages: UnifiedMessage[], userId: string | undefined, lastReadAt: number): number {
  if (!userId) return 0;
  return messages.filter(
    (m) => m.sender_id !== userId && new Date(m.created_at ?? 0).getTime() > lastReadAt
  ).length;
}

export function MessengerPanel() {
  const { isOpen, isMinimized, params, closeMessenger, toggleMinimized } = useMessengerPanel();
  const { userId, entityType, activeBrand, activeShowroom } = useAdminEntity();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [showroom, setShowroom] = useState<Showroom | null>(null);
  const [allMessages, setAllMessages] = useState<UnifiedMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageBody, setMessageBody] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [threadPlacementId, setThreadPlacementId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !params) return;
    setLoading(true);
    setThreadPlacementId(null);
    const { brandId, showroomId } = params;
    (async () => {
      const [{ data: b }, { data: sh }] = await Promise.all([
        supabase.from('brands').select('*').eq('id', brandId).single(),
        supabase.from('showrooms').select('*').eq('id', showroomId).single(),
      ]);
      setBrand((b as Brand) ?? null);
      setShowroom((sh as Showroom) ?? null);

      const { data: productsData } = await supabase.from('products').select('id').eq('brand_id', brandId);
      const productIds = ((productsData as { id: number }[]) ?? []).map((x) => x.id);
      let placementIds: string[] = [];
      if (productIds.length > 0) {
        const { data: placementsData } = await supabase
          .from('placements')
          .select('id')
          .eq('showroom_id', showroomId)
          .in('product_id', productIds)
          .order('created_at', { ascending: true });
        const list = (placementsData as { id: string }[]) ?? [];
        placementIds = list.map((x) => x.id);
        if (list.length > 0) setThreadPlacementId(list[0].id);
      }

      const conversationId = await getOrCreateConversationId(brandId, showroomId);

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
      const lastReadAt = typeof window !== 'undefined' ? parseFloat(localStorage.getItem(LAST_READ_KEY(brandId, showroomId)) || '0') || 0 : 0;
      setUnreadCount(getUnreadCount(unified, userId ?? undefined, lastReadAt));
      setLoading(false);
    })();
  }, [isOpen, params, userId]);

  // Marquer comme lu quand le panneau est ouvert (étendu)
  useEffect(() => {
    if (!params || isMinimized || loading || allMessages.length === 0) return;
    const latest = Math.max(...allMessages.map((m) => new Date(m.created_at ?? 0).getTime()), Date.now());
    const key = LAST_READ_KEY(params.brandId, params.showroomId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, String(latest));
    }
    setUnreadCount(0);
  }, [params, isMinimized, loading, allMessages.length]);

  // Rafraîchir les messages quand la bulle est réduite pour détecter les non lus
  useEffect(() => {
    if (!isOpen || !params || !isMinimized) return;
    const { brandId, showroomId } = params;
    const refetch = async () => {
      const { data: productsData } = await supabase.from('products').select('id').eq('brand_id', brandId);
      const productIds = ((productsData as { id: number }[]) ?? []).map((x) => x.id);
      let placementIds: string[] = [];
      if (productIds.length > 0) {
        const { data: placementsData } = await supabase
          .from('placements')
          .select('id')
          .eq('showroom_id', showroomId)
          .in('product_id', productIds);
        placementIds = ((placementsData as { id: string }[]) ?? []).map((x) => x.id);
      }
      const conversationId = await getOrCreateConversationId(brandId, showroomId);
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
      const lastReadAt = typeof window !== 'undefined' ? parseFloat(localStorage.getItem(LAST_READ_KEY(brandId, showroomId)) || '0') || 0 : 0;
      const count = getUnreadCount(unified, userId ?? undefined, lastReadAt);
      setAllMessages(unified);
      setUnreadCount(count);
    };
    const t = setInterval(refetch, 12000);
    return () => clearInterval(t);
  }, [isOpen, params, isMinimized, userId, toggleMinimized]);

  // Ouvrir automatiquement le panneau (déplier la bulle) quand il y a des messages non lus
  useEffect(() => {
    if (isMinimized && unreadCount > 0) {
      toggleMinimized();
    }
  }, [isMinimized, unreadCount]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!params || !userId || !messageBody.trim() || sendingMessage) return;
    const senderRole: 'brand' | 'boutique' = entityType === 'showroom' ? 'boutique' : 'brand';
    const conversationId = await getOrCreateConversationId(params.brandId, params.showroomId);
    if (!conversationId) return;
    setSendingMessage(true);
    try {
      const { error: err } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: userId,
        sender_role: senderRole,
        content: messageBody.trim(),
        is_read: false,
      });
      if (!err) {
        const { data } = await supabase
          .from('messages')
          .select('id, sender_id, sender_role, content, created_at, message_type, placement_id')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });
        const convList = (data as Message[]) ?? [];
        setAllMessages((prev) => {
          const rest = prev.filter((m) => m.source !== 'conversation');
          const next = [...rest, ...convList.map((m) => ({ source: 'conversation' as const, id: m.id, sender_id: m.sender_id, content: m.content, created_at: m.created_at, sender_role: m.sender_role ?? null, message_type: m.message_type ?? null, placement_id: m.placement_id ?? null }))];
          next.sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());
          return next;
        });
        setMessageBody('');
      }
    } finally {
      setSendingMessage(false);
    }
  }

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <button
        type="button"
        onClick={toggleMinimized}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-neutral-900 text-white pl-1 pr-4 py-1 shadow-lg hover:bg-neutral-800 transition-colors relative"
        aria-label={unreadCount > 0 ? `${unreadCount} message(s) non lu(s)` : 'Ouvrir la messagerie'}
      >
        <span className="relative shrink-0">
          {params?.avatarUrl?.trim() ? (
            <img src={params.avatarUrl.trim()} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-white" />
          ) : (
            <span className="flex w-9 h-9 items-center justify-center rounded-full bg-neutral-700">
              <MessageSquare className="h-5 w-5" />
            </span>
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </span>
        <span className="text-sm font-medium max-w-[180px] truncate">{params?.title ?? 'Messagerie'}</span>
      </button>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20"
        aria-hidden
        onClick={closeMessenger}
      />
      <div
        className="fixed top-0 right-0 z-50 h-full bg-white border-l border-neutral-200 shadow-xl flex flex-col"
        style={{ width: PANEL_WIDTH }}
      >
        <div className="flex items-center justify-between gap-2 p-3 border-b border-neutral-200 bg-neutral-50 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {params?.avatarUrl?.trim() ? (
              <img src={params.avatarUrl.trim()} alt="" className="w-10 h-10 rounded-full object-cover border border-neutral-200 shrink-0" />
            ) : (
              <span className="flex w-10 h-10 items-center justify-center rounded-full bg-neutral-200 shrink-0">
                <MessageSquare className="h-5 w-5 text-neutral-500" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-neutral-900 truncate text-sm">Messagerie · {params?.title ?? ''}</h2>
              {unreadCount > 0 && (
                <p className="text-xs text-neutral-500">{unreadCount} message{unreadCount > 1 ? 's' : ''} non lu{unreadCount > 1 ? 's' : ''}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {(params?.placementId ?? threadPlacementId) && (
              <Link
                href={`/admin/placements/${params?.placementId ?? threadPlacementId ?? ''}`}
                className="text-xs text-neutral-600 hover:text-neutral-900 font-medium"
              >
                Voir le détail
              </Link>
            )}
            <button
              type="button"
              onClick={toggleMinimized}
              className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700"
              aria-label="Réduire"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={closeMessenger}
              className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          {loading ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
                {(params?.placementId ?? threadPlacementId) && (
                  <Link
                    href={`/admin/placements/${params?.placementId ?? threadPlacementId ?? ''}`}
                    className="flex items-center gap-2 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 hover:border-neutral-300"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-neutral-500" />
                    Voir le détail de l’offre et des produits
                  </Link>
                )}
                {allMessages.length === 0 && !(params?.placementId ?? threadPlacementId) && (
                  <p className="text-sm text-neutral-500 text-center py-4">Aucun message. Envoyez un message pour démarrer.</p>
                )}
                {allMessages.map((m) => {
                  const content = m.content;
                  if (m.source === 'conversation' && m.message_type && m.message_type !== 'chat') {
                    return (
                      <div key={`${m.source}-${m.id}`} className="flex justify-center my-2">
                        <span className="bg-gray-100 text-gray-500 text-xs py-1 px-3 rounded-full text-center">
                          {content}
                        </span>
                      </div>
                    );
                  }
                  const isTransaction = content.startsWith('[Modification]') || (content.startsWith('[') && content.includes(']'));
                  const text = isTransaction ? content.replace(/^\[Modification\]\s*/, '') : content;
                  const isMe =
                    m.source === 'conversation' && (m.sender_role === 'brand' || m.sender_role === 'boutique')
                      ? (entityType === 'showroom' ? m.sender_role === 'boutique' : m.sender_role === 'brand')
                      : m.sender_id === userId;
                  // Afficher selon l’espace actuel : “moi” = marque ou boutique active, “l’autre” = l’autre partie de la conversation
                  const senderName = isMe
                    ? (entityType === 'brand' ? (activeBrand?.brand_name ?? 'Marque') : entityType === 'showroom' ? (activeShowroom?.name ?? 'Boutique') : 'Moi')
                    : (entityType === 'brand' ? (showroom?.name ?? 'Boutique') : entityType === 'showroom' ? (brand?.brand_name ?? 'Marque') : 'Utilisateur');
                  const senderAvatarUrl = isMe
                    ? (entityType === 'brand' ? activeBrand?.avatar_url : entityType === 'showroom' ? activeShowroom?.avatar_url : null)
                    : (entityType === 'brand' ? showroom?.avatar_url : entityType === 'showroom' ? brand?.avatar_url : null);
                  const uniqKey = `${m.source}-${m.id}`;

                  if (isTransaction) {
                    const isAccept = /accepté l'offre/i.test(text);
                    const isRefuseOrCancel = /refusé|annulé/i.test(text);
                    const isCounter = /contre-offre/i.test(text);
                    const Icon = isAccept ? CheckCircle : isRefuseOrCancel ? XCircle : isCounter ? RefreshCw : FileText;
                    const iconClass = isAccept ? 'text-green-600' : isRefuseOrCancel ? 'text-red-600' : 'text-neutral-500';
                    return (
                      <div key={uniqKey} className="flex justify-center">
                        <div className="max-w-[95%] rounded-lg px-3 py-2 border border-neutral-200 bg-amber-50/80">
                          <p className="text-[10px] uppercase tracking-wider text-amber-800/80 font-medium mb-1">Transaction</p>
                          <div className="flex items-start gap-2">
                            <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${iconClass}`} />
                            <div>
                              <p className="text-xs text-neutral-700">{text}</p>
                              <p className="text-[10px] text-neutral-500 mt-1">{m.created_at ? new Date(m.created_at).toLocaleString('fr-FR') : ''}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Mes messages à gauche (expéditeur), reçus à droite
                  return (
                    <div key={uniqKey} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
                      <div className={`flex gap-2 max-w-[85%] ${isMe ? 'flex-row' : 'flex-row-reverse'}`}>
                        {senderAvatarUrl?.trim() ? (
                          <img src={senderAvatarUrl.trim()} alt="" className="w-8 h-8 rounded-full object-cover border border-neutral-200 shrink-0 mt-0.5" />
                        ) : (
                          <span className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center shrink-0 mt-0.5">
                            <MessageSquare className="h-4 w-4 text-neutral-500" />
                          </span>
                        )}
                        <div className={`rounded-lg px-2.5 py-1.5 text-sm min-w-0 ${isMe ? 'bg-neutral-200 text-neutral-900' : 'bg-neutral-100 text-neutral-900'}`}>
                          <p className="text-[10px] font-medium text-neutral-600">{senderName}</p>
                          <p className="whitespace-pre-wrap mt-0.5 break-words">{m.content}</p>
                          <p className="text-[10px] text-neutral-500 mt-0.5">{m.created_at ? new Date(m.created_at).toLocaleString('fr-FR') : ''}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={sendMessage} className="p-3 border-t border-neutral-200 bg-white flex gap-2 shrink-0">
                <input
                  type="text"
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Écrire un message…"
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-neutral-200 text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
                <button
                  type="submit"
                  disabled={sendingMessage || !messageBody.trim()}
                  className="px-3 py-2 rounded-lg bg-neutral-900 text-white font-medium hover:bg-neutral-800 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                >
                  {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Envoyer
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
