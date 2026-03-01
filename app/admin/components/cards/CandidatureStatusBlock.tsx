'use client';

import Link from 'next/link';

export type CandidatureStatus = 'pending' | 'accepted' | 'rejected';

type Props = {
  status: CandidatureStatus;
  conversationId: string;
  /** Si true et status === 'rejected', affiche le bouton "Candidater à nouveau" */
  canReapply?: boolean;
  onReapply?: () => void;
};

/** Bloc de statut de candidature - même rendu graphique partout (Discover, listes, etc.). */
export function CandidatureStatusBlock({ status, conversationId, canReapply, onReapply }: Props) {
  if (status === 'pending') {
    return (
      <div
        className="w-full flex flex-col items-center gap-1.5 py-2.5 rounded-xl border border-amber-200 bg-amber-50/80 text-amber-800 text-sm"
        title="Nous vous préviendrons dès que la boutique aura répondu."
      >
        <span className="font-medium">Candidature en cours d&apos;examen</span>
        <span className="text-xs text-amber-700/90">Nous vous préviendrons dès que la boutique aura répondu.</span>
        <Link href={`/messages?conversationId=${conversationId}`} className="text-xs font-medium text-amber-800 underline hover:no-underline">
          Accéder à la discussion
        </Link>
      </div>
    );
  }

  if (status === 'accepted') {
    return (
      <div className="w-full flex flex-col items-center gap-1.5 py-2.5 rounded-lg border border-green-200 bg-green-50 text-green-800 text-sm">
        <span className="font-medium">Candidature déjà acceptée pour cette période</span>
        <Link href={`/messages?conversationId=${conversationId}`} className="text-xs font-medium underline hover:no-underline">
          Accéder à la discussion
        </Link>
      </div>
    );
  }

  // rejected
  return (
    <div className="w-full flex flex-col items-center gap-1.5 py-2.5 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-600 text-sm">
      <span className="font-medium">Refusée – Crédit libéré</span>
      <Link href={`/messages?conversationId=${conversationId}`} className="text-xs font-medium text-neutral-900 underline hover:no-underline">
        Voir la conversation
      </Link>
      {canReapply && onReapply && (
        <button type="button" onClick={onReapply} className="text-xs font-medium text-neutral-900 underline hover:no-underline">
          Candidater à nouveau
        </button>
      )}
    </div>
  );
}
