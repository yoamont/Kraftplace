'use client';

import { useState } from 'react';
import { useAdminEntity } from '../context/AdminEntityContext';
import { Coins, Loader2, X } from 'lucide-react';

const PACKS = [
  { id: 3 as const, label: 'Pack 3 Crédits', price: '15', credits: 3 },
  { id: 10 as const, label: 'Pack 10 Crédits', price: '40', credits: 10 },
];

type Props = {
  onClose: () => void;
  title?: string;
  /** Message d’intro (ex. depuis « Plus de crédits » sur Discover) */
  introMessage?: string;
};

export function CreditsRechargeModal({ onClose, title = 'Recharger mes crédits' }: Props) {
  const { activeBrand } = useAdminEntity();
  const [loading, setLoading] = useState<3 | 10 | null>(null);

  const handleBuy = async (pack: 3 | 10) => {
    if (!activeBrand) return;
    setLoading(pack);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_id: activeBrand.id, pack }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur');
      if (data.url) {
        onClose();
        window.location.href = data.url;
      } else {
        throw new Error('URL de paiement manquante');
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur lors du paiement');
      setLoading(null);
    }
  };

  if (!activeBrand) return null;

  const credits = activeBrand.credits ?? 0;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" aria-hidden onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden pointer-events-auto flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-labelledby="recharge-modal-title"
        >
          <div className="p-4 border-b border-neutral-200 flex items-center justify-between gap-3">
            <h2 id="recharge-modal-title" className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
              <Coins className="h-5 w-5" />
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-4 overflow-y-auto">
            <p className="text-sm text-neutral-600 mb-4">
              {introMessage ?? "Vous n'avez plus de crédits disponibles. Achetez un pack pour continuer à candidater."}
            </p>
            <div className="mb-4 p-3 rounded-lg bg-neutral-50 border border-neutral-200">
              <p className="text-xs text-neutral-500">Solde actuel</p>
              <p className="text-lg font-semibold text-neutral-900">{credits} crédit{credits !== 1 ? 's' : ''}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {PACKS.map((pack) => (
                <div
                  key={pack.id}
                  className="border border-neutral-200 rounded-xl p-4 hover:border-neutral-400 transition"
                >
                  <h3 className="font-semibold text-neutral-900">{pack.label}</h3>
                  <p className="text-neutral-600 text-sm mt-0.5">{pack.credits} crédits</p>
                  <p className="mt-2 text-lg font-semibold">{pack.price} €</p>
                  <button
                    type="button"
                    onClick={() => handleBuy(pack.id)}
                    disabled={loading !== null}
                    className="mt-3 w-full rounded-full bg-neutral-900 text-white py-2 px-4 font-medium hover:bg-neutral-800 disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
                  >
                    {loading === pack.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Acheter'
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
