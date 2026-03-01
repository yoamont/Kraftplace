'use client';

import { useState } from 'react';
import { useAdminEntity } from '../context/AdminEntityContext';
import { Coins, Loader2 } from 'lucide-react';

const PACKS = [
  { id: 3 as const, label: 'Pack 3 Crédits', price: '15', credits: 3 },
  { id: 10 as const, label: 'Pack 10 Crédits', price: '40', credits: 10 },
];

export default function CreditsPage() {
  const { entityType, activeBrand } = useAdminEntity();
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
      if (data.url) window.location.href = data.url;
      else throw new Error('URL de paiement manquante');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur lors du paiement');
      setLoading(null);
    }
  };

  if (entityType !== 'brand') {
    return (
      <div className="p-6 max-w-2xl">
        <p className="text-kraft-600">Cette page est réservée aux marques.</p>
      </div>
    );
  }

  const credits = activeBrand?.credits ?? 0;

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold text-kraft-black flex items-center gap-2">
        <Coins className="h-7 w-7" />
        Crédits
      </h1>
      <p className="text-kraft-600 mt-1 mb-6">
        Achetez des packs de crédits pour votre marque.
      </p>

      <div className="mb-8 p-4 rounded-xl bg-kraft-100 border border-kraft-200">
        <p className="text-sm text-kraft-600">Solde actuel</p>
        <p className="text-2xl font-semibold text-kraft-black">{credits} crédit{credits !== 1 ? 's' : ''}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {PACKS.map((pack) => (
          <div
            key={pack.id}
            className="border border-kraft-200 rounded-xl p-5 hover:border-kraft-400 transition"
          >
            <h2 className="font-semibold text-kraft-black">{pack.label}</h2>
            <p className="text-kraft-600 text-sm mt-1">{pack.credits} crédits</p>
            <p className="mt-2 text-lg font-semibold">{pack.price} €</p>
            <button
              type="button"
              onClick={() => handleBuy(pack.id)}
              disabled={loading !== null}
              className="mt-4 w-full rounded-full bg-kraft-black text-white py-2.5 px-4 font-medium hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
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
  );
}
