'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import confetti from 'canvas-confetti';

export default function CreditsSuccessPage() {
  const searchParams = useSearchParams();
  const fired = useRef(false);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId || fired.current) return;
    fired.current = true;

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
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-kraft-50 px-4">
      <div className="text-center max-w-md">
        <h1 className="font-serif text-3xl md:text-4xl text-kraft-black mb-3">
          Crédits ajoutés&nbsp;!
        </h1>
        <p className="text-kraft-700 mb-8">
          Votre achat a bien été enregistré. Les crédits sont disponibles sur votre espace marque.
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
