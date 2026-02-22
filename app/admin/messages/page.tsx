'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

/** Redirection vers la messagerie pleine page /messages. */
export default function AdminMessagesRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const conversationId = searchParams.get('conversationId');
    const q = conversationId ? `?conversationId=${conversationId}` : '';
    router.replace(`/messages${q}`);
  }, [router, searchParams]);

  return (
    <div className="flex flex-1 min-h-0 items-center justify-center p-6">
      <p className="text-neutral-500">Redirection vers la messagerie…</p>
    </div>
  );
}
