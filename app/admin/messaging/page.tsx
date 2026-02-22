'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

/**
 * Redirection vers l’inbox unique /messages.
 * Les nouvelles conversations se créent depuis la page publique du créateur (ContactBrandButton).
 */
export default function AdminMessagingRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const conversationId = searchParams.get('conversationId');
    const q = conversationId ? `?conversationId=${conversationId}` : '';
    router.replace(`/messages${q}`);
  }, [router, searchParams]);

  return (
    <div className="p-6 flex items-center justify-center">
      <p className="text-neutral-500">Redirection vers la messagerie…</p>
    </div>
  );
}
