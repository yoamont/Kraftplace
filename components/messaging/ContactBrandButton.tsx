'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquare, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Props = {
  brandId: number;
  className?: string;
  children?: React.ReactNode;
};

/**
 * Bouton pour initier une conversation avec un créateur (marque).
 * À placer sur la page publique du créateur. Réservé aux boutiques :
 * - Si une conversation existe déjà → redirection vers /messages?conversationId=...
 * - Sinon → création de la conversation puis redirection.
 */
export function ContactBrandButton({ brandId, className, children }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setError(null);
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        setLoading(false);
        router.push(`/login?redirect=${encodeURIComponent(`/marque/${brandId}`)}`);
        return;
      }

      const { data: showrooms } = await supabase
        .from('showrooms')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1);

      const showroom = Array.isArray(showrooms) ? showrooms[0] : showrooms;
      if (!showroom) {
        setError('Aucune boutique n’est liée à votre compte. Complétez votre profil depuis le tableau de bord.');
        setLoading(false);
        return;
      }

      const showroomId = (showroom as { id: number }).id;

      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('brand_id', brandId)
        .eq('showroom_id', showroomId)
        .maybeSingle();

      const conv = existing as { id: string } | null;
      if (conv?.id) {
        router.push(`/messages?conversationId=${conv.id}&showroom=${showroomId}`);
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

      router.push(`/messages?conversationId=${(inserted as { id: string }).id}&showroom=${showroomId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={
          className ??
          'inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-kraft-900 text-white text-sm font-semibold hover:bg-kraft-800 disabled:opacity-70 disabled:cursor-not-allowed'
        }
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MessageSquare className="h-4 w-4" />
        )}
        {children ?? 'Contacter le créateur'}
      </button>
      {error && (
        <p className="text-xs text-red-600">
          {error}
          <Link href="/admin" className="block mt-1 font-medium text-neutral-900 hover:underline">
            Aller au tableau de bord →
          </Link>
        </p>
      )}
    </div>
  );
}
