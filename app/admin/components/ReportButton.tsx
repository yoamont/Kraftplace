'use client';

import { useState } from 'react';
import { Flag } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Props = {
  entityType: 'brand' | 'showroom';
  entityId: number;
  entityName?: string;
  className?: string;
};

export function ReportButton({ entityType, entityId, entityName, className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = entityType === 'brand' ? 'cette marque' : 'cette boutique';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          entityType,
          entityId,
          reason: reason.trim() || null,
          message: message.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? 'Envoi impossible.');
        return;
      }
      setDone(true);
      setReason('');
      setMessage('');
      setTimeout(() => {
        setOpen(false);
        setDone(false);
      }, 1500);
    } catch {
      setError('Erreur réseau.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-700 transition-colors ${className}`}
        aria-label={`Signaler ce profil ${label}`}
      >
        <Flag className="h-3.5 w-3.5" strokeWidth={1.5} />
        Signaler ce profil
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            aria-hidden
            onClick={() => !submitting && setOpen(false)}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm mx-4 bg-white rounded-xl shadow-xl border border-black/[0.06] p-4" role="dialog" aria-modal="true" aria-labelledby="report-title">
            <h2 id="report-title" className="text-lg font-semibold text-neutral-900 mb-2">Signaler ce profil</h2>
            {entityName && <p className="text-sm text-neutral-600 mb-3">{entityName}</p>}
            {done ? (
              <p className="text-sm text-emerald-600 font-medium">Signalement envoyé. Merci.</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label htmlFor="report-reason" className="block text-xs font-medium text-neutral-600 mb-1">Motif (optionnel)</label>
                  <input
                    id="report-reason"
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Contenu inapproprié, fausse info…"
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                  />
                </div>
                <div>
                  <label htmlFor="report-message" className="block text-xs font-medium text-neutral-600 mb-1">Message (optionnel)</label>
                  <textarea
                    id="report-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={2}
                    placeholder="Précisez si besoin…"
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 resize-none"
                  />
                </div>
                {error && <p className="text-xs text-red-600" role="alert">{error}</p>}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => !submitting && setOpen(false)}
                    className="flex-1 py-2 rounded-lg border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
                  >
                    {submitting ? 'Envoi…' : 'Envoyer'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </>
  );
}
