'use client';

import { Suspense } from 'react';
import { AdminEntityProvider } from '@/app/admin/context/AdminEntityContext';

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-6 text-neutral-500">Chargement…</div>}>
      <AdminEntityProvider>{children}</AdminEntityProvider>
    </Suspense>
  );
}
