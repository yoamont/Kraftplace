'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import type { CandidatureThreadMessage } from '@/lib/supabase';
import { MessageItem } from './MessageItem';

type MessageListProps = {
  /** ID de la candidature dont on affiche le fil */
  candidatureId: string;
  /** Côté du viewer (brand ou showroom) pour l’alignement des bulles */
  viewerSide: 'brand' | 'showroom';
  /** Messages (chargés par le parent ou vide pour chargement interne) */
  messages?: CandidatureThreadMessage[] | null;
  /** Chargement initial (si messages non fournis) */
  loading?: boolean;
  /** Label pour l’expéditeur “marque” (ex: nom de la marque) */
  brandLabel?: string;
  /** Label pour l’expéditeur “boutique” (ex: nom du showroom) */
  showroomLabel?: string;
  /** Si true, charge les messages en interne par candidature_id */
  fetchByCandidature?: boolean;
  /** Incrémenter pour forcer un refetch (ex: après envoi ou après action candidature) */
  refreshKey?: number;
};

const SELECT_COLS = 'id, candidature_id, sender_id, sender_role, content, is_read, created_at, type, metadata';

export function MessageList({
  candidatureId,
  viewerSide,
  messages: controlledMessages,
  loading: controlledLoading,
  brandLabel = 'Marque',
  showroomLabel = 'Boutique',
  fetchByCandidature = true,
  refreshKey = 0,
}: MessageListProps) {
  const [internalMessages, setInternalMessages] = useState<CandidatureThreadMessage[]>([]);
  const [internalLoading, setInternalLoading] = useState(fetchByCandidature);
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fetchByCandidature || !candidatureId) {
      setInternalLoading(false);
      return;
    }
    let cancelled = false;
    setInternalLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(SELECT_COLS)
        .eq('candidature_id', candidatureId)
        .order('created_at', { ascending: true });
      if (!cancelled) {
        if (error) setInternalMessages([]);
        else setInternalMessages((data as CandidatureThreadMessage[]) ?? []);
        setInternalLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [candidatureId, fetchByCandidature, refreshKey]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [controlledMessages ?? internalMessages]);

  const messages = controlledMessages ?? internalMessages;
  const loading = controlledMessages != null ? controlledLoading : internalLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" aria-hidden />
      </div>
    );
  }

  if (!messages?.length) {
    return (
      <div className="py-6 text-center text-sm text-neutral-500">
        Aucun message pour le moment. Les événements (offre envoyée, acceptée) s’afficheront ici.
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {messages.map((msg) => (
        <MessageItem
          key={msg.id}
          message={msg}
          viewerSide={viewerSide}
          senderLabel={
            msg.sender_role === 'brand'
              ? brandLabel
              : msg.sender_role === 'boutique'
                ? showroomLabel
                : undefined
          }
        />
      ))}
      <div ref={listEndRef} />
    </div>
  );
}
