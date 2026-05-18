'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BrowseBrandsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/admin/marques'); }, [router]);
  return null;
}
