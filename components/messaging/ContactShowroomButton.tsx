'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Props = {
  showroomId: number;
  brandId: number;
  className?: string;
  children?: React.ReactNode;
};

/**
 * Bouton pour initier une conversation avec une boutique (showroom).
 * À placer sur la fiche boutique côté marque (ex: Vendre mes produits).
 * - Si une conversation existe déjà → redirection vers /messages?conversationId=...
 * - Sinon → création de la conversation puis redirection.
 */
export function ContactShowroomButton({ showroomId, brandId, className, children }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setError(null);
    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('brand_id', brandId)
        .eq('showroom_id', showroomId)
        .maybeSingle();

      const conv = existing as { id: string } | null;
      if (conv?.id) {
        router.push(`/messages?conversationId=${conv.id}`);
        return;
      }

      const { data: inserted, error: insertErr } = await supabase
        .from('conversations')
        .insert({ brand_id: brandId, showroom_id: showroomId })
        .select('id')
        .single();

      if (insertErr || !inserted) {
        setError(insertErr?.message ?? 'Impossible de créer la conversation.');
        setLoading(false);
        return;
      }

      router.push(`/messages?conversationId=${(inserted as { id: string }).id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-stretch gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={
          className ??
          'inline-flex items-center justify-center gap-2 py-2 rounded-lg border border-neutral-300 bg-white text-neutral-700 text-sm font-medium hover:bg-neutral-50 hover:border-neutral-400 disabled:opacity-70 disabled:cursor-not-allowed'
        }
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        ) : (
          <MessageSquare className="h-4 w-4 shrink-0" />
        )}
        {children ?? 'Contacter la boutique'}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
