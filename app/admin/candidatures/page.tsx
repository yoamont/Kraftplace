'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CandidaturesRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/placements');
  }, [router]);
  return null;
}
