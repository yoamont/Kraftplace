'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { MessageSquare } from 'lucide-react';

function AnnonceSuccesContent() {
  const searchParams = useSearchParams();
  const conversationId = searchParams.get('conversationId');

  return (
    <div className="min-h-screen bg-[#FBFBFD] flex flex-col">
      <header className="nav-kraft shrink-0 flex items-center justify-between px-4 py-2.5 sticky top-9 z-50">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-[#1A1A1A] font-semibold tracking-tight kraftplace-wordmark text-base">Kraftplace</span>
          <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider text-[#5c4a38] bg-[#c9b896]/40 border border-[#C4B09A]">Beta</span>
        </Link>
        <Link href="/login" className="text-xs font-medium text-[#1A1A1A]/90 hover:text-[#1A1A1A] transition-colors">Connexion</Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mb-4">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-semibold text-xl text-neutral-900 tracking-tight">Candidature envoyée</h1>
          <p className="mt-2 text-sm font-light text-neutral-500">
            Votre candidature a bien été envoyée. La boutique vous répondra par messagerie.
          </p>
          {conversationId ? (
            <Link
              href={`/messages?conversationId=${encodeURIComponent(conversationId)}`}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-60 transition-colors duration-150"
            >
              <MessageSquare className="h-4 w-4" strokeWidth={1.5} />
              Suivre ma candidature dans la messagerie
            </Link>
          ) : (
            <Link
              href="/admin/messages"
              className="mt-6 w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors duration-150"
            >
              <MessageSquare className="h-4 w-4" strokeWidth={1.5} />
              Ouvrir la messagerie
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}

export default function AnnonceSuccesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FBFBFD] flex items-center justify-center">
        <div className="text-neutral-500 text-sm">Chargement…</div>
      </div>
    }>
      <AnnonceSuccesContent />
    </Suspense>
  );
}
