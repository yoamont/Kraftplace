'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Route legacy /messages — redirige vers /admin/messages.
 * Conserve le paramètre conversationId si présent.
 */
export default function MessagesRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const conversationId = searchParams.get('conversationId');
    const target = conversationId
      ? `/admin/messages?conversationId=${conversationId}`
      : '/admin/messages';
    router.replace(target);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#FBFBFD] flex items-center justify-center">
      <p className="text-sm text-neutral-500">Redirection…</p>
    </div>
  );
}
