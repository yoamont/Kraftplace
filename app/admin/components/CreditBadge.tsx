'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Coins, Plus } from 'lucide-react';
import { useAdminEntity } from '../context/AdminEntityContext';
import { CreditsRechargeModal } from './CreditsRechargeModal';

/**
 * Badge crédits pour la sidebar (marques uniquement).
 * Affiche "✨ X crédits disponibles" ou, si 0, badge rouge + bouton "+" ouvrant la modal de recharge.
 */
export function CreditBadge() {
  const { entityType, activeBrand } = useAdminEntity();
  const [showRechargeModal, setShowRechargeModal] = useState(false);

  if (entityType !== 'brand' || !activeBrand) return null;

  const credits = typeof activeBrand.credits === 'number' ? activeBrand.credits : 0;
  const reserved = typeof (activeBrand as { reserved_credits?: number }).reserved_credits === 'number'
    ? (activeBrand as { reserved_credits: number }).reserved_credits
    : 0;
  const available = credits - reserved;

  if (available <= 0) {
    return (
      <>
        <div className="mt-3 p-3 rounded-lg border border-red-200 bg-red-50">
          <p className="text-xs font-medium text-red-800">0 crédit restant</p>
          <button
            type="button"
            onClick={() => setShowRechargeModal(true)}
            className="mt-2 w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700"
            aria-label="Recharger les crédits"
          >
            <Plus className="h-4 w-4" /> Recharger
          </button>
        </div>
        {showRechargeModal && (
          <CreditsRechargeModal onClose={() => setShowRechargeModal(false)} title="Recharger mes crédits" />
        )}
      </>
    );
  }

  return (
    <Link
      href="/admin/credits"
      className="mt-3 flex items-center gap-2 p-3 rounded-lg border border-kraft-200 bg-kraft-100/80 hover:bg-kraft-200/80 transition-colors"
    >
      <Coins className="h-4 w-4 text-kraft-700 shrink-0" />
      <span className="text-sm font-semibold text-kraft-900">
        ✨ {available} crédit{available !== 1 ? 's' : ''} disponible{available !== 1 ? 's' : ''}
      </span>
    </Link>
  );
}
