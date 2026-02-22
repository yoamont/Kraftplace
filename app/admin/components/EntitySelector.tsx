'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAdminEntity } from '../context/AdminEntityContext';
import { Sparkles, Store, ChevronDown } from 'lucide-react';

export function EntitySelector() {
  const router = useRouter();
  const pathname = usePathname();
  const { brands, showrooms, entityType, entityId, setEntity, activeBrand, activeShowroom, loading } = useAdminEntity();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const label =
    entityType === 'brand' && activeBrand
      ? activeBrand.brand_name
      : entityType === 'showroom' && activeShowroom
        ? activeShowroom.name
        : 'Choisir une entité';

  const handleSelect = (type: 'brand' | 'showroom', id: number) => {
    setEntity(type, id);
    const params = new URLSearchParams();
    if (type === 'brand') params.set('brand', String(id));
    else params.set('showroom', String(id));
    router.replace(`${pathname || '/admin'}?${params.toString()}`, { scroll: false });
    setOpen(false);
  };

  if (loading) {
    return <div className="h-10 w-full max-w-[200px] rounded-lg bg-kraft-100 animate-pulse" />;
  }

  if (brands.length === 0 && showrooms.length === 0) {
    return <div className="text-sm text-kraft-500">Aucune entité</div>;
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-kraft-300 bg-kraft-50 hover:bg-kraft-100 text-left text-sm font-semibold text-kraft-black"
        aria-expanded={open}
      >
        {entityType === 'brand' && activeBrand?.avatar_url?.trim() ? (
          <img src={activeBrand.avatar_url.trim()} alt="" className="h-8 w-8 rounded-full object-cover border border-kraft-200 shrink-0" />
        ) : entityType === 'showroom' && activeShowroom?.avatar_url?.trim() ? (
          <img src={activeShowroom.avatar_url.trim()} alt="" className="h-8 w-8 rounded-full object-cover border border-kraft-200 shrink-0" />
        ) : entityType === 'brand' ? (
          <Sparkles className="h-4 w-4 text-kraft-500 shrink-0" />
        ) : (
          <Store className="h-4 w-4 text-kraft-500 shrink-0" />
        )}
        <span className="truncate flex-1">{label}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 py-1 bg-kraft-50 border-2 border-kraft-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {brands.length > 0 && (
            <div className="px-2 py-1">
              <p className="px-2 text-xs font-medium text-kraft-400 uppercase">Marques</p>
              {brands.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleSelect('brand', b.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left ${entityType === 'brand' && entityId === b.id ? 'bg-kraft-100 text-kraft-black' : 'text-kraft-700 hover:bg-kraft-50'}`}
                >
                  {b.avatar_url?.trim() ? (
                    <img src={b.avatar_url.trim()} alt="" className="h-8 w-8 rounded-full object-cover border border-kraft-200 shrink-0" />
                  ) : (
                    <Sparkles className="h-4 w-4 shrink-0 text-kraft-500" />
                  )}
                  <span className="truncate">{b.brand_name}</span>
                </button>
              ))}
            </div>
          )}
          {showrooms.length > 0 && (
            <div className="px-2 py-1 border-t border-kraft-100">
              <p className="px-2 text-xs font-medium text-kraft-400 uppercase">Boutiques</p>
              {showrooms.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelect('showroom', s.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left ${entityType === 'showroom' && entityId === s.id ? 'bg-kraft-100 text-kraft-black' : 'text-kraft-700 hover:bg-kraft-50'}`}
                >
                  {s.avatar_url?.trim() ? (
                    <img src={s.avatar_url.trim()} alt="" className="h-8 w-8 rounded-full object-cover border border-kraft-200 shrink-0" />
                  ) : (
                    <Store className="h-4 w-4 shrink-0 text-kraft-500" />
                  )}
                  <span className="truncate">{s.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
