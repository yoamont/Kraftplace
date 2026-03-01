'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ButtonBrand } from '@/components/landing/ButtonBrand';
import { ButtonShowroom } from '@/components/landing/ButtonShowroom';

export function LandingHeader() {
  const [user, setUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u ? { id: u.id } : null));
  }, []);

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 border-b border-black/[0.06] bg-[#FBFBFD]/95 backdrop-blur-md">
      <Link href="/" className="flex items-center gap-3">
        <span className="text-neutral-900 font-semibold tracking-tight kraftplace-wordmark text-lg">Kraftplace</span>
        <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider text-neutral-500 bg-neutral-100 border border-black/[0.06]">
          Beta
        </span>
      </Link>
      <nav className="flex flex-wrap items-center gap-3 sm:gap-4">
        <Link
          href={user ? '/admin' : '/login'}
          className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
        >
          Se connecter
        </Link>
        <ButtonShowroom href="/signup?type=showroom">
          <span className="block text-center leading-tight">
            <span className="block font-bold">Je suis une boutique</span>
            <span className="block text-xs font-normal opacity-90">s&apos;inscrire</span>
          </span>
        </ButtonShowroom>
        <ButtonBrand href="/signup?type=brand">
          <span className="block text-center leading-tight">
            <span className="block font-bold">Je suis une marque</span>
            <span className="block text-xs font-normal opacity-90">s&apos;inscrire</span>
          </span>
        </ButtonBrand>
      </nav>
    </header>
  );
}
