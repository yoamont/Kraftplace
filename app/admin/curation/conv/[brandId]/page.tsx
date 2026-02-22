'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminEntity } from '../../../context/AdminEntityContext';
import { useMessengerPanel } from '../../../context/MessengerPanelContext';

export default function CurationConvRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const brandIdParam = params?.brandId as string | undefined;
  const brandId = brandIdParam != null ? parseInt(brandIdParam, 10) : NaN;
  const { activeShowroom, entityType } = useAdminEntity();
  const { openMessenger } = useMessengerPanel();

  useEffect(() => {
    if (entityType !== 'showroom' || !activeShowroom || Number.isNaN(brandId) || brandId <= 0) {
      router.replace('/admin/curation');
      return;
    }
    openMessenger({ brandId, showroomId: activeShowroom.id, title: 'Marque' });
    router.replace('/admin/curation');
  }, [entityType, activeShowroom, brandId, openMessenger, router]);

  return null;
}
