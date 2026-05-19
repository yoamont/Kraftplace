'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ButtonBrand } from '@/components/landing/ButtonBrand';
import { ButtonShowroom } from '@/components/landing/ButtonShowroom';
import { UserMenu } from '@/components/landing/UserMenu';

type Entity = { name: string; avatarUrl: string | null; role: 'brand' | 'showroom' };

export function LandingHeader() {
  const [entity, setEntity] = useState<Entity | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setEntity(null); setAuthChecked(true); return; }

      const [{ data: brand }, { data: showroom }] = await Promise.all([
        supabase.from('brands').select('brand_name, avatar_url').eq('owner_id', user.id).order('id').limit(1).maybeSingle(),
        supabase.from('showrooms').select('name, avatar_url').eq('owner_id', user.id).order('id').limit(1).maybeSingle(),
      ]);

      if (brand) {
        setEntity({ name: (brand as { brand_name: string; avatar_url: string | null }).brand_name, avatarUrl: (brand as { brand_name: string; avatar_url: string | null }).avatar_url, role: 'brand' });
      } else if (showroom) {
        setEntity({ name: (showroom as { name: string; avatar_url: string | null }).name, avatarUrl: (showroom as { name: string; avatar_url: string | null }).avatar_url, role: 'showroom' });
      }
      setAuthChecked(true);
    }

    load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { load(); });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 border-b border-black/[0.06] bg-[#FBFBFD]/95 backdrop-blur-md">
      <Link href="/" className="flex items-center gap-3">
        <span className="text-neutral-900 font-semibold tracking-tight kraftplace-wordmark text-lg">Kraftplace</span>
        <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider text-neutral-500 bg-neutral-100 border border-black/[0.06]">
          Beta
        </span>
      </Link>

      <nav className="flex items-center gap-3 sm:gap-4">
        {!authChecked ? (
          <div className="h-9 w-24 rounded-full bg-neutral-100 animate-pulse" />
        ) : entity ? (
          <UserMenu entityName={entity.name} avatarUrl={entity.avatarUrl} role={entity.role} />
        ) : (
          <>
            <Link
              href="/login"
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
          </>
        )}
      </nav>
    </header>
  );
}
