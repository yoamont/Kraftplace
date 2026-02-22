'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAdminEntity } from '../context/AdminEntityContext';
import { Loader2, Bell } from 'lucide-react';
import type { Notification } from '@/lib/supabase';

function notificationLink(n: Notification, entityType: 'brand' | 'showroom' | null): string | null {
  if (n.type === 'placement_message' && n.reference_id) return `/admin/placements/${n.reference_id}`;
  if (n.type === 'candidature_message') return entityType === 'showroom' ? '/admin/curation' : '/admin/placements';
  return null;
}

export default function NotificationsPage() {
  const { userId, entityType } = useAdminEntity();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);
      setNotifications((data as Notification[]) ?? []);
      setLoading(false);
    })();
  }, [userId]);

  async function markAsRead(id: string) {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  async function markAllAsRead() {
    if (!userId) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  if (!userId) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <p className="text-neutral-600">Connectez-vous pour voir vos notifications.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Notifications</h1>
          <p className="mt-1 text-sm text-neutral-500">Mises à jour sur vos échanges et candidatures.</p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
          >
            Tout marquer comme lu
          </button>
        )}
      </div>

      {notifications.length === 0 && (
        <div className="mt-8 p-8 rounded-xl border border-neutral-200 bg-white text-center text-neutral-500">
          <Bell className="h-10 w-10 mx-auto text-neutral-300 mb-2" />
          <p>Aucune notification.</p>
        </div>
      )}

      {notifications.length > 0 && (
        <ul className="mt-6 space-y-2">
          {notifications.map((n) => {
            const href = notificationLink(n, entityType);
            const content = (
              <div className={`p-4 rounded-xl border ${n.read ? 'bg-white border-neutral-200' : 'bg-neutral-50 border-neutral-200'}`}>
                <p className={`text-sm font-medium ${n.read ? 'text-neutral-600' : 'text-neutral-900'}`}>{n.title}</p>
                {n.body && <p className="text-sm text-neutral-500 mt-0.5 line-clamp-2">{n.body}</p>}
                <p className="text-xs text-neutral-400 mt-1">
                  {n.created_at ? new Date(n.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                </p>
              </div>
            );
            return (
              <li key={n.id}>
                {href ? (
                  <Link
                    href={href}
                    onClick={() => !n.read && markAsRead(n.id)}
                    className="block hover:opacity-90"
                  >
                    {content}
                  </Link>
                ) : (
                  <div onClick={() => !n.read && markAsRead(n.id)} className="cursor-default">
                    {content}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
