'use client';

import { useState, useEffect } from 'react';
import { X, MessageSquare, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Brand, Showroom } from '@/lib/supabase';

/** Pour trier : contreparties avec conversation récente en premier (id + date) */
export type RecentCounterpart = { id: number; updatedAt: string };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** Côté marque : on choisit une boutique. Côté boutique : on choisit une marque. */
  mode: 'brand' | 'showroom';
  brandId: number | null;
  showroomId: number | null;
  userId: string | null;
  /** Contreparties déjà en conversation, triées par interaction récente (updated_at desc) */
  recentCounterparts?: RecentCounterpart[];
  getOrCreateConversation: (brandId: number, showroomId: number) => Promise<string | null>;
  onCreated: (conversationId: string) => void;
};

type ShowroomOption = Pick<Showroom, 'id' | 'name' | 'avatar_url'>;
type BrandOption = Pick<Brand, 'id' | 'brand_name' | 'avatar_url'>;

export function NewConversationModal({
  isOpen,
  onClose,
  mode,
  brandId,
  showroomId,
  userId,
  recentCounterparts = [],
  getOrCreateConversation,
  onCreated,
}: Props) {
  const [options, setOptions] = useState<ShowroomOption[] | BrandOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSearch('');
    setFetchError(null);
    setLoading(true);

    const applyOptions = (raw: { id: number; owner_id?: string }[], excludeOwn: boolean) => {
      const list = excludeOwn && userId
        ? raw.filter((r) => r.owner_id !== userId)
        : raw;
      const withoutOwner = list.map(({ owner_id: _, ...rest }) => rest);
      setOptions(withoutOwner as ShowroomOption[] | BrandOption[]);
    };

    const done = (raw: { id: number; owner_id?: string }[], excludeOwn: boolean) => {
      applyOptions(raw, excludeOwn);
      setFetchError(null);
      setLoading(false);
    };

    const fallbackClientFetch = () => {
      if (mode === 'brand') {
        let q = supabase
          .from('showrooms')
          .select('id, name, avatar_url')
          .eq('publication_status', 'published')
          .order('name');
        if (userId) q = q.neq('owner_id', userId);
        q.then(({ data, error }) => {
          if (error) setFetchError(error.message);
          setOptions((data as ShowroomOption[]) ?? []);
          setLoading(false);
        });
      } else {
        let q = supabase
          .from('brands')
          .select('id, brand_name, avatar_url')
          .order('brand_name');
        if (userId) q = q.neq('owner_id', userId);
        q.then(({ data, error }) => {
          if (error) setFetchError(error.message);
          setOptions((data as BrandOption[]) ?? []);
          setLoading(false);
        });
      }
    };

    const tryApiThenClient = () => {
      fetch(`/api/messaging/counterparts?mode=${mode}`)
        .then((res) => {
          if (res.ok) {
            return res.json().then((body: { options: { id: number; owner_id?: string }[] }) => {
              done(body.options ?? [], true);
            });
          }
          if (res.status === 503) {
            fallbackClientFetch();
            return;
          }
          res.json()
            .then((body: { error?: string }) => setFetchError(body?.error ?? res.statusText))
            .catch(() => setFetchError(res.statusText))
            .finally(() => {
              setOptions([]);
              setLoading(false);
            });
        })
        .catch(() => fallbackClientFetch());
    };

    // 1) Essayer d'abord les RPC (contournent la RLS sans clé service role)
    const rpcName = mode === 'brand' ? 'get_showrooms_for_messaging' : 'get_brands_for_messaging';
    void Promise.resolve(
      supabase.rpc(rpcName)
    ).then(({ data, error }) => {
      if (!error && Array.isArray(data)) {
        done(data as { id: number; owner_id: string }[], true);
        return;
      }
      tryApiThenClient();
    }).catch(() => tryApiThenClient());
  }, [isOpen, mode, userId]);

  const filtered =
    search.trim() === ''
      ? options
      : mode === 'brand'
        ? (options as ShowroomOption[]).filter((s) =>
            s.name.toLowerCase().includes(search.toLowerCase())
          )
        : (options as BrandOption[]).filter((b) =>
            b.brand_name.toLowerCase().includes(search.toLowerCase())
          );

  // Trier : d'abord les contreparties avec conversation récente (par updated_at desc), puis le reste par nom
  const recentById = new Map(recentCounterparts.map((r) => [r.id, r.updatedAt]));
  const sorted = [...filtered].sort((a, b) => {
    const aRecent = recentById.get(a.id);
    const bRecent = recentById.get(b.id);
    if (aRecent && bRecent) return new Date(bRecent).getTime() - new Date(aRecent).getTime();
    if (aRecent) return -1;
    if (bRecent) return 1;
    const aName = mode === 'brand' ? (a as ShowroomOption).name : (a as BrandOption).brand_name;
    const bName = mode === 'brand' ? (b as ShowroomOption).name : (b as BrandOption).brand_name;
    return aName.localeCompare(bName, 'fr');
  });

  const handleSelect = async (id: number) => {
    const bId = mode === 'brand' ? brandId! : id;
    const sId = mode === 'showroom' ? showroomId! : id;
    if (bId == null || sId == null) return;
    setCreating(true);
    try {
      const convId = await getOrCreateConversation(bId, sId);
      if (convId) {
        onCreated(convId);
        onClose();
      }
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  const title =
    mode === 'brand'
      ? 'Choisir une boutique'
      : 'Choisir une marque';

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40"
        aria-hidden
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col pointer-events-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-conversation-title"
        >
          <div className="p-4 border-b border-neutral-200 flex items-center justify-between shrink-0">
            <h2 id="new-conversation-title" className="text-lg font-semibold text-neutral-900">
              Nouvelle conversation
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="px-4 pb-2 text-sm text-neutral-500">{title}</p>

          <div className="px-4 pb-3 shrink-0">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={mode === 'brand' ? 'Rechercher une boutique…' : 'Rechercher une marque…'}
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-400 text-sm focus:outline-none focus:ring-2 focus:ring-kraft-900 focus:border-transparent"
            />
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 border-t border-neutral-100">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-kraft-600" />
              </div>
            ) : fetchError ? (
              <div className="py-8 px-4 text-center">
                <p className="text-sm text-red-600 font-medium mb-1">Erreur au chargement</p>
                <p className="text-xs text-neutral-500 mb-3">{fetchError}</p>
                <p className="text-xs text-neutral-500">
                  Assurez-vous d’avoir exécuté le script SQL des politiques de messagerie (voir <code className="bg-neutral-100 px-1 rounded">supabase-messaging-list-brands-showrooms.sql</code>).
                </p>
              </div>
            ) : sorted.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <p className="text-sm text-neutral-500">
                  {search.trim() ? 'Aucun résultat.' : 'Aucune option disponible.'}
                </p>
                {!search.trim() && (
                  <p className="mt-3 text-xs text-neutral-400 max-w-sm mx-auto">
                    Exécutez le script <code className="bg-neutral-100 px-1 rounded">supabase-messaging-counterparts-rpc.sql</code> dans Supabase → SQL Editor, ou ajoutez <code className="bg-neutral-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> dans .env.local.
                  </p>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {sorted.map((item) => {
                  const id = item.id;
                  const name = mode === 'brand' ? (item as ShowroomOption).name : (item as BrandOption).brand_name;
                  const avatarUrl = item.avatar_url;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(id)}
                        disabled={creating}
                        className="w-full flex items-center gap-3 p-3 text-left hover:bg-neutral-50 disabled:opacity-60"
                      >
                        {avatarUrl?.trim() ? (
                          <img
                            src={avatarUrl.trim()}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover border border-neutral-200 shrink-0"
                          />
                        ) : (
                          <span className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center shrink-0">
                            <MessageSquare className="h-5 w-5 text-neutral-500" />
                          </span>
                        )}
                        <span className="font-medium text-neutral-900 truncate">{name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {creating && (
            <div className="p-3 border-t border-neutral-100 flex items-center justify-center gap-2 text-sm text-neutral-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Ouverture…
            </div>
          )}
        </div>
      </div>
    </>
  );
}
