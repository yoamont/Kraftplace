'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAdminEntity } from '../context/AdminEntityContext';
import { Sparkles, Store, ChevronDown } from 'lucide-react';
import type { Brand, Showroom } from '@/lib/supabase';

export function EntitySelector() {
  const router = useRouter();
  const pathname = usePathname();
  const { accountRole, entityId, setEntity, activeBrand, activeShowroom, loading, ownedEntities } = useAdminEntity();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeEntity = accountRole === 'brand' ? activeBrand : activeShowroom;
  const activeLabel = activeEntity
    ? (accountRole === 'brand' ? (activeEntity as Brand).brand_name : (activeEntity as Showroom).name)
    : 'Choisir';
  const activeAvatar = activeEntity?.avatar_url?.trim() ?? null;

  const handleSelect = (id: number) => {
    setEntity(accountRole, id);
    const params = new URLSearchParams();
    if (accountRole === 'brand') params.set('brand', String(id));
    else params.set('showroom', String(id));
    router.replace(`${pathname || '/admin'}?${params.toString()}`, { scroll: false });
    setOpen(false);
  };

  if (loading) {
    return <div className="h-10 w-full rounded-lg bg-neutral-100 animate-pulse" />;
  }

  if (ownedEntities.length === 0) return null;

  // If only one entity, show a simple non-clickable label
  if (ownedEntities.length === 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-50 border border-black/[0.06]">
        {activeAvatar ? (
          <img src={activeAvatar} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
        ) : accountRole === 'brand' ? (
          <Sparkles className="h-4 w-4 text-neutral-500 shrink-0" strokeWidth={1.5} />
        ) : (
          <Store className="h-4 w-4 text-neutral-500 shrink-0" strokeWidth={1.5} />
        )}
        <span className="text-sm font-medium text-neutral-800 truncate">{activeLabel}</span>
      </div>
    );
  }

  // Multiple entities of the same role → dropdown
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-black/[0.06] bg-neutral-50 hover:bg-neutral-100 text-left text-sm font-medium text-neutral-800 transition-colors"
        aria-expanded={open}
      >
        {activeAvatar ? (
          <img src={activeAvatar} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
        ) : accountRole === 'brand' ? (
          <Sparkles className="h-4 w-4 text-neutral-500 shrink-0" strokeWidth={1.5} />
        ) : (
          <Store className="h-4 w-4 text-neutral-500 shrink-0" strokeWidth={1.5} />
        )}
        <span className="truncate flex-1">{activeLabel}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 py-1 bg-white border border-black/[0.06] rounded-xl shadow-lg z-50 max-h-64 overflow-y-auto">
          {ownedEntities.map((entity) => {
            const id = entity.id;
            const name = accountRole === 'brand' ? (entity as Brand).brand_name : (entity as Showroom).name;
            const avatar = entity.avatar_url?.trim() ?? null;
            const isActive = entityId === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleSelect(id)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors ${isActive ? 'bg-neutral-100 text-neutral-900 font-medium' : 'text-neutral-700 hover:bg-neutral-50'}`}
              >
                {avatar ? (
                  <img src={avatar} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
                ) : accountRole === 'brand' ? (
                  <Sparkles className="h-4 w-4 shrink-0 text-neutral-400" strokeWidth={1.5} />
                ) : (
                  <Store className="h-4 w-4 shrink-0 text-neutral-400" strokeWidth={1.5} />
                )}
                <span className="truncate">{name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
