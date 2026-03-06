'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import confetti from 'canvas-confetti';
import { supabase } from '@/lib/supabase';

function CreditsSuccessContent() {
  const searchParams = useSearchParams();
  const fired = useRef(false);
  const [confirmStatus, setConfirmStatus] = useState<'pending' | 'ok' | 'already' | 'error'>('pending');
  const [confirmMessage, setConfirmMessage] = useState<string>('');

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId || fired.current) return;
    fired.current = true;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setConfirmStatus('error');
        setConfirmMessage('Vous devez être connecté pour enregistrer les crédits. Connectez-vous puis rouvrez cette page.');
        return;
      }
      try {
        const res = await fetch('/api/credits/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ session_id: sessionId }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && (data as { ok?: boolean }).ok) {
          setConfirmStatus((data as { already_processed?: boolean }).already_processed ? 'already' : 'ok');
          if ((data as { credits_added?: number }).credits_added) {
            setConfirmMessage(`${(data as { credits_added: number }).credits_added} crédits ont été ajoutés.`);
          }
        } else {
          setConfirmStatus('error');
          setConfirmMessage((data as { error?: string }).error ?? `Erreur ${res.status}. Si la table stripe_credit_sessions n'existe pas, exécutez le script supabase-stripe-credit-sessions.sql dans Supabase.`);
        }
      } catch (e) {
        setConfirmStatus('error');
        setConfirmMessage('Erreur réseau. Réessayez ou actualisez la page.');
      }
    })();

    const duration = 2_000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#000', '#f5f5f5', '#d4af37'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#000', '#f5f5f5', '#d4af37'],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-kraft-50 px-4">
      <div className="text-center max-w-md">
        <h1 className="font-serif text-3xl md:text-4xl text-kraft-black mb-3">
          {confirmStatus === 'error' ? 'Enregistrement des crédits' : 'Crédits ajoutés\u00a0!'}
        </h1>
        <p className="text-kraft-700 mb-8">
          {confirmStatus === 'error' && confirmMessage ? (
            <span className="block text-left text-sm bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800">
              {confirmMessage}
            </span>
          ) : confirmStatus === 'ok' && confirmMessage ? (
            confirmMessage
          ) : confirmStatus === 'already' ? (
            'Ces crédits avaient déjà été enregistrés. Ils sont disponibles sur votre espace marque.'
          ) : confirmStatus === 'pending' ? (
            'Enregistrement de votre achat…'
          ) : (
            'Votre achat a bien été enregistré. Les crédits sont disponibles sur votre espace marque.'
          )}
        </p>
        <Link
          href="/admin"
          className="inline-flex items-center justify-center rounded-full bg-kraft-black text-white px-6 py-3 font-medium hover:opacity-90 transition"
        >
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  );
}

export default function CreditsSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-kraft-50 px-4">
        <div className="text-center max-w-md">
          <p className="text-kraft-700">Chargement…</p>
        </div>
      </div>
    }>
      <CreditsSuccessContent />
    </Suspense>
  );
}
