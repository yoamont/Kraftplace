'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { LayoutDashboard, CreditCard, Settings, LogOut, ChevronDown } from 'lucide-react';

interface Props {
  entityName: string;
  avatarUrl: string | null;
  role: 'brand' | 'showroom';
}

export function UserMenu({ entityName, avatarUrl, role }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    setOpen(false);
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  const initials = entityName.trim().slice(0, 2).toUpperCase() || '?';
  const settingsHref = role === 'brand' ? '/admin/brand-config' : '/admin/showroom-config';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-2.5 py-1.5 hover:bg-neutral-50 transition-colors"
        aria-expanded={open}
      >
        <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 overflow-hidden">
          {avatarUrl?.trim() ? (
            <img src={avatarUrl.trim()} alt="" className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </span>
        <span className="text-sm font-medium text-neutral-800 max-w-[120px] truncate hidden sm:block">{entityName}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-white border border-black/[0.06] rounded-2xl shadow-lg z-50 py-1.5 overflow-hidden">
          <div className="px-3 py-2 border-b border-black/[0.05] mb-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400">
              {role === 'brand' ? 'Espace Marque' : 'Espace Boutique'}
            </p>
            <p className="text-sm font-medium text-neutral-900 truncate mt-0.5">{entityName}</p>
          </div>

          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <LayoutDashboard className="h-4 w-4 text-neutral-400 shrink-0" strokeWidth={1.5} />
            {role === 'brand' ? 'Mon espace Marque' : 'Mon espace Boutique'}
          </Link>

          {role === 'brand' && (
            <Link
              href="/admin/credits"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              <CreditCard className="h-4 w-4 text-neutral-400 shrink-0" strokeWidth={1.5} />
              Mes transactions
            </Link>
          )}

          <Link
            href={settingsHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <Settings className="h-4 w-4 text-neutral-400 shrink-0" strokeWidth={1.5} />
            Mes paramètres
          </Link>

          <div className="border-t border-black/[0.05] mt-1 pt-1">
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
