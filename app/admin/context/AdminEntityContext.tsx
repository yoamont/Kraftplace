'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Brand, Showroom } from '@/lib/supabase';

export type EntityType = 'brand' | 'showroom';

export type AdminEntityState = {
  brands: Brand[];
  showrooms: Showroom[];
  entityType: EntityType | null;
  entityId: number | null;
  loading: boolean;
  userId: string | null;
};

type AdminEntityContextValue = AdminEntityState & {
  setEntity: (type: EntityType | null, id: number | null) => void;
  activeBrand: Brand | null;
  activeShowroom: Showroom | null;
  refresh: () => Promise<void>;
};

const AdminEntityContext = createContext<AdminEntityContextValue | null>(null);

export function AdminEntityProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const [state, setState] = useState<AdminEntityState>({
    brands: [],
    showrooms: [],
    entityType: null,
    entityId: null,
    loading: true,
    userId: null,
  });

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setState((s) => ({ ...s, brands: [], showrooms: [], entityType: null, entityId: null, loading: false, userId: null }));
      return;
    }

    const [brandsRes, showroomsRes] = await Promise.all([
      supabase.from('brands').select('*').eq('owner_id', user.id).order('brand_name'),
      supabase.from('showrooms').select('*').eq('owner_id', user.id).order('name'),
    ]);

    const brands = (brandsRes.data as Brand[] | null) ?? [];
    const showrooms = (showroomsRes.data as Showroom[] | null) ?? [];

    setState((s) => {
      let entityType = s.entityType;
      let entityId = s.entityId;
      const urlBrand = searchParams.get('brand');
      const urlShowroom = searchParams.get('showroom');
      if (urlBrand) {
        const id = parseInt(urlBrand, 10);
        if (!Number.isNaN(id) && brands.some((b) => b.id === id)) {
          entityType = 'brand';
          entityId = id;
        }
      }
      if (urlShowroom) {
        const id = parseInt(urlShowroom, 10);
        if (!Number.isNaN(id) && showrooms.some((sh) => sh.id === id)) {
          entityType = 'showroom';
          entityId = id;
        }
      }
      if (entityType == null || entityId == null) {
        if (brands.length > 0) {
          entityType = 'brand';
          entityId = brands[0].id;
        } else if (showrooms.length > 0) {
          entityType = 'showroom';
          entityId = showrooms[0].id;
        } else {
          entityType = null;
          entityId = null;
        }
      }
      if (entityType === 'brand' && entityId != null && !brands.some((b) => b.id === entityId)) {
        entityType = brands.length > 0 ? 'brand' : showrooms.length > 0 ? 'showroom' : null;
        entityId = brands.length > 0 ? brands[0].id : showrooms.length > 0 ? showrooms[0].id : null;
      }
      if (entityType === 'showroom' && entityId != null && !showrooms.some((sh) => sh.id === entityId)) {
        entityType = brands.length > 0 ? 'brand' : showrooms.length > 0 ? 'showroom' : null;
        entityId = brands.length > 0 ? brands[0].id : showrooms.length > 0 ? showrooms[0].id : null;
      }
      return { ...s, brands, showrooms, entityType, entityId, loading: false, userId: user.id };
    });
  }, [searchParams]);

  useEffect(() => {
    load();
  }, [load]);

  const setEntity = useCallback((type: EntityType | null, id: number | null) => {
    setState((s) => ({ ...s, entityType: type, entityId: id }));
  }, []);

  const activeBrand = useMemo(
    () => (state.entityType === 'brand' && state.entityId != null ? state.brands.find((b) => b.id === state.entityId) ?? null : null),
    [state.entityType, state.entityId, state.brands]
  );

  const activeShowroom = useMemo(
    () => (state.entityType === 'showroom' && state.entityId != null ? state.showrooms.find((s) => s.id === state.entityId) ?? null : null),
    [state.entityType, state.entityId, state.showrooms]
  );

  const value = useMemo(
    () => ({ ...state, setEntity, activeBrand, activeShowroom, refresh: load }),
    [state, setEntity, activeBrand, activeShowroom, load]
  );

  return <AdminEntityContext.Provider value={value}>{children}</AdminEntityContext.Provider>;
}

export function useAdminEntity() {
  const ctx = useContext(AdminEntityContext);
  if (!ctx) throw new Error('useAdminEntity must be used within AdminEntityProvider');
  return ctx;
}
