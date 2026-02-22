'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminEntity } from '../../../context/AdminEntityContext';
import { useMessengerPanel } from '../../../context/MessengerPanelContext';

export default function PlacementConvRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const showroomIdParam = params?.showroomId as string | undefined;
  const showroomId = showroomIdParam != null ? parseInt(showroomIdParam, 10) : NaN;
  const { activeBrand, entityType } = useAdminEntity();
  const { openMessenger } = useMessengerPanel();

  useEffect(() => {
    if (entityType !== 'brand' || !activeBrand || Number.isNaN(showroomId) || showroomId <= 0) {
      router.replace('/admin/placements');
      return;
    }
    openMessenger({ brandId: activeBrand.id, showroomId, title: 'Boutique' });
    router.replace('/admin/placements');
  }, [entityType, activeBrand, showroomId, openMessenger, router]);

  return null;
}
