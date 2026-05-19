'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Loader2, CheckCircle, Clock, Send } from 'lucide-react';

type Status = 'loading' | 'unauthenticated' | 'not_brand' | 'can_apply' | 'applied' | 'accepted' | 'no_credits';

interface Props {
  showroomId: number;
  showroomSlug: string;
}

export function CandidatureCTA({ showroomId, showroomSlug }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('loading');
  const [brandId, setBrandId] = useState<number | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (!cancelled) setStatus('unauthenticated'); return; }

      const { data: brand } = await supabase
        .from('brands')
        .select('id, credits, reserved_credits')
        .eq('owner_id', user.id)
        .order('id')
        .limit(1)
        .maybeSingle();

      if (!brand) { if (!cancelled) setStatus('not_brand'); return; }

      const b = brand as { id: number; credits: number; reserved_credits: number };
      if (!cancelled) setBrandId(b.id);

      const { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .eq('brand_id', b.id)
        .eq('showroom_id', showroomId)
        .is('listing_id', null)
        .limit(1)
        .maybeSingle();

      if (!conv) {
        const available = b.credits - b.reserved_credits;
        if (!cancelled) setStatus(available <= 0 ? 'no_credits' : 'can_apply');
        return;
      }

      if (!cancelled) setConversationId(conv.id as string);

      const { data: msgs } = await supabase
        .from('messages')
        .select('type')
        .eq('conversation_id', conv.id)
        .in('type', ['CANDIDATURE_SENT', 'CANDIDATURE_ACCEPTED'])
        .order('created_at', { ascending: true });

      const types = ((msgs ?? []) as { type: string }[]).map((m) => m.type);
      const hasSent = types.includes('CANDIDATURE_SENT');
      const hasAccepted = types.includes('CANDIDATURE_ACCEPTED');

      if (!cancelled) {
        if (hasAccepted) setStatus('accepted');
        else if (hasSent) setStatus('applied');
        else {
          const available = b.credits - b.reserved_credits;
          setStatus(available <= 0 ? 'no_credits' : 'can_apply');
        }
      }
    }

    check();
    return () => { cancelled = true; };
  }, [showroomId]);

  async function handleApply() {
    if (!brandId || sending) return;
    setSending(true);
    setError(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSending(false); setError('Session expirée, veuillez vous reconnecter.'); return; }

    try {
      const res = await fetch('/api/candidatures/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ brandId, showroomId, metadata: { status: 'pending' } }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Une erreur est survenue.');
        return;
      }
      setConversationId(json.conversationId);
      setStatus('applied');
    } finally {
      setSending(false);
    }
  }

  if (status === 'loading') {
    return (
      <div className="mx-6 mb-6 p-6 rounded-2xl bg-neutral-900 text-white flex items-center justify-center min-h-[96px]">
        <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="mx-6 mb-6 p-6 rounded-2xl bg-neutral-900 text-white text-center">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400 mb-2">Vous êtes une marque ?</p>
        <p className="text-sm font-semibold leading-snug">Candidatez pour exposer<br />dans cette boutique</p>
        <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <Link
            href={`/login?redirect=/boutique/${showroomSlug}`}
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-white text-neutral-900 text-sm font-semibold hover:bg-neutral-100 transition-colors"
          >
            Se connecter pour candidater
          </Link>
          <Link
            href="/signup?type=brand"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 rounded-full border border-white/20 text-white text-sm font-medium hover:bg-white/10 transition-colors"
          >
            Créer un compte marque
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'not_brand') return null;

  if (status === 'accepted') {
    return (
      <div className="mx-6 mb-6 p-5 rounded-2xl bg-emerald-900/80 text-white flex items-center gap-3">
        <CheckCircle className="h-5 w-5 shrink-0 text-emerald-300" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Candidature acceptée !</p>
          <p className="text-xs text-emerald-200 mt-0.5">Cette boutique a accepté votre demande de collaboration.</p>
        </div>
        {conversationId && (
          <button
            type="button"
            onClick={() => router.push(`/admin/messages?conversationId=${conversationId}`)}
            className="shrink-0 px-3 py-1.5 rounded-full bg-emerald-700 text-white text-xs font-medium hover:bg-emerald-600 transition-colors"
          >
            Messagerie
          </button>
        )}
      </div>
    );
  }

  if (status === 'applied') {
    return (
      <div className="mx-6 mb-6 p-5 rounded-2xl bg-neutral-800 text-white flex items-center gap-3">
        <Clock className="h-5 w-5 shrink-0 text-neutral-400" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Candidature envoyée</p>
          <p className="text-xs text-neutral-400 mt-0.5">En attente de réponse de la boutique.</p>
        </div>
        {conversationId && (
          <button
            type="button"
            onClick={() => router.push(`/admin/messages?conversationId=${conversationId}`)}
            className="shrink-0 px-3 py-1.5 rounded-full bg-neutral-700 text-white text-xs font-medium hover:bg-neutral-600 transition-colors"
          >
            Voir
          </button>
        )}
      </div>
    );
  }

  if (status === 'no_credits') {
    return (
      <div className="mx-6 mb-6 p-6 rounded-2xl bg-neutral-900 text-white text-center">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400 mb-2">Vous êtes une marque ?</p>
        <p className="text-sm font-semibold leading-snug">Candidatez pour exposer<br />dans cette boutique</p>
        <p className="mt-3 text-xs text-neutral-400">Crédits insuffisants. Rechargez vos crédits pour candidater.</p>
        <Link
          href="/admin"
          className="mt-4 inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-white text-neutral-900 text-sm font-semibold hover:bg-neutral-100 transition-colors"
        >
          Mon espace marque
        </Link>
      </div>
    );
  }

  // can_apply
  return (
    <div className="mx-6 mb-6 p-6 rounded-2xl bg-neutral-900 text-white text-center">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400 mb-2">Vous êtes une marque ?</p>
      <p className="text-sm font-semibold leading-snug">Candidatez pour exposer<br />dans cette boutique</p>
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      <button
        type="button"
        onClick={handleApply}
        disabled={sending}
        className="mt-5 inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-white text-neutral-900 text-sm font-semibold hover:bg-neutral-100 disabled:opacity-60 transition-colors"
      >
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Candidater
      </button>
    </div>
  );
}
