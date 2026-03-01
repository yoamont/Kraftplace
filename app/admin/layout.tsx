'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LayoutDashboard, Package, Store, Settings, LayoutGrid, LogOut, Menu, X, MessageSquare, Bell, Building2, Search, Coins, FileText } from 'lucide-react';
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
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const { userId, entityType, brands, showrooms, loading, activeBrand, activeShowroom } = useAdminEntity();
  const { unreadCount: unreadMessagesCount } = useUnreadMessagesCount(userId, activeBrand ?? null, activeShowroom ?? null);

  useEffect(() => {
    if (!userId) {
      setUnreadNotifications(0);
      return;
    }
    (async () => {
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);
      setUnreadNotifications(count ?? 0);
    })();
  }, [userId, pathname]);

  useEffect(() => {
    if (loading) return;
    if (!userId) {
      router.replace('/login');
      return;
    }
  }, [loading, userId, router]);

  const brandNav = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/brand-config', label: 'Ma marque', icon: Building2 },
    { href: '/admin/products', label: 'Mon Catalogue', icon: Package },
    { href: '/admin/discover', label: 'Vendre mes produits', icon: Store },
    { href: '/admin/credits', label: 'Crédits', icon: Coins },
    { href: '/admin/placements', label: 'Mes partenariats', icon: LayoutGrid },
    { href: '/messages', label: 'Messagerie', icon: MessageSquare },
    { href: '/admin/notifications', label: 'Notifications', icon: Bell },
  ];
  const showroomNav = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/showroom-config', label: 'Ma boutique', icon: Settings },
    { href: '/admin/listings', label: 'Mes Annonces', icon: FileText },
    { href: '/admin/curation', label: 'Mes partenariats', icon: LayoutGrid },
    { href: '/admin/browse-brands', label: 'Parcourir les marques', icon: Search },
    { href: '/messages', label: 'Messagerie', icon: MessageSquare },
    { href: '/admin/notifications', label: 'Notifications', icon: Bell },
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
      <div className="min-h-screen bg-kraft-50 flex items-center justify-center">
        <p className="text-kraft-700 font-medium">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-kraft-50 flex">
      {open && (
        <button type="button" aria-label="Fermer" className="fixed inset-0 bg-kraft-black/20 z-20 lg:hidden" onClick={() => setOpen(false)} />
      )}
      <aside
        className={`fixed top-0 left-0 z-30 h-full w-64 bg-kraft-50 border-r border-kraft-300 lg:relative lg:translate-x-0 transition-transform ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-kraft-300">
            <Link href="/" className="flex items-center gap-2">
              <span className="font-semibold text-kraft-black tracking-tight kraftplace-wordmark text-lg">Kraftplace</span>
            </Link>
            <div className="mt-3">
              <EntitySelector />
            </div>
            <CreditBadge />
            <button type="button" className="lg:hidden absolute top-4 right-4 p-2" onClick={() => setOpen(false)} aria-label="Fermer">
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href));
              const showUnreadBubble = href === '/messages' && unreadMessagesCount > 0;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold ${isActive ? 'bg-kraft-300 text-kraft-black' : 'text-kraft-700 hover:bg-kraft-200 hover:text-kraft-black'}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
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
          <div className="p-3 border-t border-kraft-300">
            <button
              type="button"
              onClick={() => { setOpen(false); logout(); }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-semibold text-kraft-700 hover:bg-kraft-200 hover:text-kraft-black"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Déconnexion
            </button>
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 h-14 px-4 flex items-center justify-between border-b border-kraft-300 bg-kraft-50">
          <div className="flex items-center">
            <button type="button" className="lg:hidden p-2 -ml-2" onClick={() => setOpen(true)} aria-label="Menu">
              <Menu className="h-5 w-5 text-kraft-700" />
            </button>
            <span className="ml-2 text-sm font-medium text-kraft-700">Admin</span>
          </div>
          <Link
            href="/admin/notifications"
            className="relative p-2 rounded-lg text-kraft-700 hover:bg-kraft-200 hover:text-kraft-black"
            aria-label={unreadNotifications > 0 ? `${unreadNotifications} notification(s) non lue(s)` : 'Notifications'}
          >
            <Bell className="h-5 w-5" />
            {unreadNotifications > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-medium">
                {unreadNotifications > 99 ? '99+' : unreadNotifications}
              </span>
            )}
          </Link>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-kraft-50 flex items-center justify-center font-medium text-kraft-700">Chargement…</div>}>
      <AdminEntityProvider>
        <MessengerPanelProvider>
          <AdminSidebar>{children}</AdminSidebar>
          <MessengerPanel />
        </MessengerPanelProvider>
      </AdminEntityProvider>
    </Suspense>
  );
}
