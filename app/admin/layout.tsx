'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LayoutDashboard, Package, Store, Settings, LayoutGrid, LogOut, Menu, X, MessageSquare, Building2, Search, FileText } from 'lucide-react';
import { AdminEntityProvider, useAdminEntity } from './context/AdminEntityContext';
import { useUnreadMessagesCount } from '@/lib/hooks/useUnreadMessagesCount';
import { MessengerPanelProvider } from './context/MessengerPanelContext';
import { MessengerPanel } from './components/MessengerPanel';
import { EntitySelector } from './components/EntitySelector';
import { CreditBadge } from './components/CreditBadge';

function AdminSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { userId, entityType, brands, showrooms, loading, activeBrand, activeShowroom } = useAdminEntity();
  const { unreadCount: unreadMessagesCount } = useUnreadMessagesCount(userId, activeBrand ?? null, activeShowroom ?? null);

  useEffect(() => {
    if (loading) return;
    if (!userId) {
      router.replace('/login');
      return;
    }
  }, [loading, userId, router]);

  const brandNav = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/brand-config', label: 'Marque', icon: Building2 },
    { href: '/admin/products', label: 'Catalogue', icon: Package },
    { href: '/admin/discover', label: 'Explorer', icon: Store },
    { href: '/admin/placements', label: 'Partenariats', icon: LayoutGrid },
    { href: '/messages', label: 'Messagerie', icon: MessageSquare },
  ];
  const showroomNav = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/showroom-config', label: 'Boutique', icon: Settings },
    { href: '/admin/listings', label: 'Annonces', icon: FileText },
    { href: '/admin/browse-brands', label: 'Marques', icon: Search },
    { href: '/admin/curation', label: 'Partenariats', icon: LayoutGrid },
    { href: '/messages', label: 'Messagerie', icon: MessageSquare },
  ];
  const navItems = entityType === 'brand' ? brandNav : entityType === 'showroom' ? showroomNav : [{ href: '/admin', label: 'Dashboard', icon: LayoutDashboard }];

  const canCreate = pathname === '/admin/onboarding' || pathname === '/admin/brands' || pathname === '/admin/showroom-config';
  useEffect(() => {
    if (loading || !userId || pathname === '/admin/onboarding' || canCreate) return;
    if (brands.length === 0 && showrooms.length === 0) router.replace('/admin');
  }, [loading, userId, brands.length, showrooms.length, pathname, canCreate, router]);

  async function logout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading || !userId) {
    return (
      <div className="min-h-screen bg-[#FBFBFD] flex items-center justify-center">
        <p className="text-neutral-600 font-medium">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFD] flex">
      {open && (
        <button type="button" aria-label="Fermer" className="fixed inset-0 bg-black/10 z-20 lg:hidden backdrop-blur-[1px]" onClick={() => setOpen(false)} />
      )}
      <aside
        className={`fixed top-0 left-0 z-30 h-full w-64 bg-white/95 backdrop-blur-md border-r border-black/[0.06] lg:relative lg:translate-x-0 transition-transform shadow-[2px_0_12px_rgba(0,0,0,0.03)] ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-black/[0.06]">
            <Link href="/" className="flex items-center gap-2">
              <span className="font-semibold text-neutral-900 tracking-tight kraftplace-wordmark text-lg">Kraftplace</span>
            </Link>
            <div className="mt-3">
              <EntitySelector />
            </div>
            <CreditBadge />
            <button type="button" className="lg:hidden absolute top-4 right-4 p-2" onClick={() => setOpen(false)} aria-label="Fermer">
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href));
              const showUnreadBubble = href === '/messages' && unreadMessagesCount > 0;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors duration-150 ${isActive ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-600 hover:bg-neutral-100/80 hover:text-neutral-900'}`}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  <span className="flex-1 min-w-0 truncate">{label}</span>
                  {showUnreadBubble && (
                    <span className="shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
                      {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
          <div className="p-3 border-t border-black/[0.06]">
            <button
              type="button"
              onClick={() => { setOpen(false); logout(); }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-100/80 hover:text-neutral-900 transition-colors duration-150"
            >
              <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              Déconnexion
            </button>
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 h-14 px-4 flex items-center justify-between border-b border-black/[0.06] bg-[#FBFBFD]/95 backdrop-blur-md">
          <div className="flex items-center">
            <button type="button" className="lg:hidden p-2 -ml-2 rounded-xl text-neutral-600 hover:bg-black/[0.06] transition-colors" onClick={() => setOpen(true)} aria-label="Menu">
              <Menu className="h-5 w-5" />
            </button>
            <span className="ml-2 text-sm font-medium text-neutral-900">Admin</span>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FBFBFD] flex items-center justify-center font-medium text-neutral-600">Chargement…</div>}>
      <AdminEntityProvider>
        <MessengerPanelProvider>
          <AdminSidebar>{children}</AdminSidebar>
          <MessengerPanel />
        </MessengerPanelProvider>
      </AdminEntityProvider>
    </Suspense>
  );
}
