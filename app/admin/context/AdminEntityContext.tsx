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
  /** Role determined at first load — immutable for the session. Brand takes precedence if both exist (legacy). */
  accountRole: EntityType | null;
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
  /** Entities relevant to the account role (brands if brand account, showrooms if showroom account) */
  ownedEntities: Brand[] | Showroom[];
};

const AdminEntityContext = createContext<AdminEntityContextValue | null>(null);

export function AdminEntityProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const [state, setState] = useState<AdminEntityState>({
    brands: [],
    showrooms: [],
    accountRole: null,
    entityType: null,
    entityId: null,
    loading: true,
    userId: null,
  });

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setState((s) => ({ ...s, brands: [], showrooms: [], accountRole: null, entityType: null, entityId: null, loading: false, userId: null }));
      return;
    }

    const [brandsRes, showroomsRes] = await Promise.all([
      supabase.from('brands').select('*').eq('owner_id', user.id).order('brand_name'),
      supabase.from('showrooms').select('*').eq('owner_id', user.id).order('name'),
    ]);

    const brands = (brandsRes.data as Brand[] | null) ?? [];
    const showrooms = (showroomsRes.data as Showroom[] | null) ?? [];

    // accountRole is set once: brands take precedence if both exist (legacy mixed account).
    const accountRole: EntityType | null = brands.length > 0 ? 'brand' : showrooms.length > 0 ? 'showroom' : null;

    // Only expose entities matching the account role.
    const roleEntities = accountRole === 'brand' ? brands : accountRole === 'showroom' ? showrooms : [];

    setState((s) => {
      let entityType = accountRole;
      let entityId: number | null = null;

      const urlBrand = searchParams.get('brand');
      const urlShowroom = searchParams.get('showroom');

      if (accountRole === 'brand' && urlBrand) {
        const id = parseInt(urlBrand, 10);
        if (!Number.isNaN(id) && brands.some((b) => b.id === id)) entityId = id;
      }
      if (accountRole === 'showroom' && urlShowroom) {
        const id = parseInt(urlShowroom, 10);
        if (!Number.isNaN(id) && showrooms.some((sh) => sh.id === id)) entityId = id;
      }

      // Restore previous selection if still valid
      if (entityId == null && s.entityId != null && s.entityType === accountRole) {
        const stillValid = accountRole === 'brand'
          ? brands.some((b) => b.id === s.entityId)
          : showrooms.some((sh) => sh.id === s.entityId);
        if (stillValid) entityId = s.entityId;
      }

      // Default to first entity
      if (entityId == null && roleEntities.length > 0) entityId = roleEntities[0].id;

      return {
        ...s,
        brands: accountRole === 'brand' ? brands : [],
        showrooms: accountRole === 'showroom' ? showrooms : [],
        accountRole,
        entityType,
        entityId,
        loading: false,
        userId: user.id,
      };
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

  const ownedEntities = useMemo(
    () => (state.accountRole === 'brand' ? state.brands : state.accountRole === 'showroom' ? state.showrooms : []),
    [state.accountRole, state.brands, state.showrooms]
  );

  const value = useMemo(
    () => ({ ...state, setEntity, activeBrand, activeShowroom, refresh: load, ownedEntities }),
    [state, setEntity, activeBrand, activeShowroom, load, ownedEntities]
  );

  return <AdminEntityContext.Provider value={value}>{children}</AdminEntityContext.Provider>;
}

export function useAdminEntity() {
  const ctx = useContext(AdminEntityContext);
  if (!ctx) throw new Error('useAdminEntity must be used within AdminEntityProvider');
  return ctx;
}
