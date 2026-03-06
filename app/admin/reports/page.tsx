'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Flag, Loader2, AlertCircle } from 'lucide-react';

type ReportRow = {
  id: string;
  created_at: string;
  reporter_id: string;
  reported_entity_type: string;
  reported_entity_id: number;
  reason: string | null;
  message: string | null;
  status: string;
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/admin/reports', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 403) {
        setError('Accès réservé aux administrateurs. Définissez ADMIN_USER_IDS dans .env pour accéder à cette page.');
        setReports([]);
      } else if (!res.ok) {
        setError('Impossible de charger les signalements.');
        setReports([]);
      } else {
        const data = await res.json();
        setReports(data);
        setError(null);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 flex items-start gap-3">
        <AlertCircle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h2 className="font-semibold text-amber-900">Accès restreint</h2>
          <p className="mt-1 text-sm text-amber-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold text-neutral-900 mb-2">Signalements</h1>
      <p className="text-sm text-neutral-500 mb-6">Profils marques et boutiques signalés par les utilisateurs.</p>
      {reports.length === 0 ? (
        <div className="rounded-xl border border-black/[0.06] bg-white p-8 text-center text-neutral-500">
          <Flag className="h-10 w-10 mx-auto text-neutral-300 mb-2" />
          <p>Aucun signalement.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-black/[0.06] bg-white overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/[0.06] bg-neutral-50/80">
                <th className="py-3 px-4 font-medium text-neutral-600">Date</th>
                <th className="py-3 px-4 font-medium text-neutral-600">Type</th>
                <th className="py-3 px-4 font-medium text-neutral-600">ID profil</th>
                <th className="py-3 px-4 font-medium text-neutral-600">Motif</th>
                <th className="py-3 px-4 font-medium text-neutral-600">Statut</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-b border-black/[0.06] last:border-b-0 hover:bg-neutral-50/50">
                  <td className="py-3 px-4 text-neutral-700 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-700">
                      {r.reported_entity_type === 'brand' ? 'Marque' : 'Boutique'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-neutral-600">{r.reported_entity_id}</td>
                  <td className="py-3 px-4 text-neutral-700 max-w-[200px] truncate" title={r.reason ?? r.message ?? undefined}>
                    {r.reason || r.message || '-'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      r.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                      r.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' :
                      r.status === 'dismissed' ? 'bg-neutral-100 text-neutral-600' : 'bg-neutral-100 text-neutral-700'
                    }`}>
                      {r.status === 'pending' ? 'En attente' : r.status === 'reviewed' ? 'Vu' : r.status === 'resolved' ? 'Résolu' : 'Rejeté'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
