'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

const navItems = [
  { href: '/boutique', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/boutique/showroom-config', label: 'Gestion du showroom', icon: Settings },
] as const;

export default function BoutiqueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showroomLabel, setShowroomLabel] = useState<string>('Espace showroom');
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) {
        setUser(null);
        setAuthChecked(true);
        return;
      }
      setUser({ id: u.id });
      const { data } = await supabase
        .from('showrooms')
        .select('name')
        .eq('owner_id', u.id);
      const list = (data as { name?: string }[] | null) ?? [];
      if (list.length === 0) setShowroomLabel('Espace showroom');
      else if (list.length === 1) setShowroomLabel(list[0].name ?? 'Mon showroom');
      else setShowroomLabel(`${list.length} showrooms`);
      setAuthChecked(true);
    }
    load();
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    if (!user) {
      router.replace('/login?redirect=/boutique');
      return;
    }
  }, [authChecked, user, router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  if (!authChecked || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          className="fixed inset-0 bg-black/20 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-30 h-full w-[260px] bg-white border-r border-gray-200
          transform transition-transform duration-200 ease-out
          lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-start justify-between gap-2 px-4 py-4 border-b border-gray-100">
            <div className="min-w-0">
              <p className="font-bold text-gray-900 tracking-tight">ESPACE SHOWROOM</p>
              <p className="text-sm text-gray-500 mt-0.5 truncate">{showroomLabel}</p>
            </div>
            <button
              type="button"
              aria-label="Fermer le menu"
              className="lg:hidden shrink-0 p-2 text-gray-500 hover:text-gray-900"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
            {navItems.map(({ href, label, icon: Icon }) => {
              const isActive =
                pathname === href || (href !== '/boutique' && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                  `}
                >
                  <Icon size={20} className="shrink-0" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                setSidebarOpen(false);
                handleLogout();
              }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <LogOut size={20} className="shrink-0" />
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 flex items-center h-14 px-4 bg-gray-50 border-b border-gray-200">
          <button
            type="button"
            aria-label="Ouvrir le menu"
            className="lg:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
          <span className="ml-2 text-sm text-gray-500 lg:ml-0">Espace showroom</span>
        </header>
        <main className="flex-1 p-4 lg:p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
