'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Redirection : le système de notifications a été supprimé. Les infos sont dans la Messagerie. */
export default function NotificationsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin');
  }, [router]);
  return null;
}
