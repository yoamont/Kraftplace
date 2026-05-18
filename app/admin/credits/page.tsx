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
      <div className="max-w-2xl">
        <p className="text-sm font-light text-neutral-500">Réservé aux marques.</p>
      </div>
    );
  }

  const credits = activeBrand?.credits ?? 0;
  const reserved = activeBrand?.reserved_credits ?? 0;
  const available = credits - reserved;

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">Crédits</h1>
      <p className="mt-0.5 text-sm font-light text-neutral-500 mb-6">Envoyez des candidatures aux boutiques.</p>

      {/* Encart explicatif */}
      <div className="mb-6 p-4 rounded-[12px] bg-emerald-50 border border-emerald-100">
        <p className="text-sm text-emerald-900 font-medium mb-1">Comment fonctionnent les crédits ?</p>
        <p className="text-sm text-emerald-800 leading-relaxed">
          1 crédit = 1 candidature envoyée à une boutique. Le crédit est réservé à l'envoi de votre candidature.
          Si la boutique refuse, il vous est restitué. Si elle accepte, il est définitivement débité.
        </p>
      </div>

      <div className="mb-8 p-4 rounded-[12px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs font-medium text-neutral-500">Disponibles</p>
            <p className="text-xl font-semibold text-neutral-900 mt-0.5">{available} crédit{available !== 1 ? 's' : ''}</p>
          </div>
          {reserved > 0 && (
            <div className="text-right">
              <p className="text-xs font-medium text-neutral-400">Réservés (candidatures en attente)</p>
              <p className="text-base font-medium text-neutral-500 mt-0.5">{reserved}</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {PACKS.map((pack) => (
          <div
            key={pack.id}
            className="rounded-[12px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-shadow duration-200"
          >
            <h2 className="font-semibold text-neutral-900">{pack.label}</h2>
            <p className="text-sm font-light text-neutral-500 mt-1">{pack.credits} crédits</p>
            <p className="mt-2 text-lg font-semibold text-neutral-900">{pack.price} €</p>
            <button
              type="button"
              onClick={() => handleBuy(pack.id)}
              disabled={loading !== null}
              className="mt-4 w-full rounded-xl bg-neutral-900 text-white py-2.5 px-4 text-sm font-medium hover:bg-neutral-800 disabled:opacity-60 transition-colors duration-150 flex items-center justify-center gap-2"
            >
              {loading === pack.id ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
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
