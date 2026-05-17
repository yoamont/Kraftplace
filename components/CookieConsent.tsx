'use client';

import { useState, useEffect } from 'react';

/**
 * Bandeau de consentement cookies RGPD.
 * Stocke le choix dans un cookie (pas localStorage) pour le lire cote serveur si besoin.
 */
export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = document.cookie
      .split('; ')
      .find((c) => c.startsWith('cookie_consent='));
    if (!consent) {
      setShow(true);
    }
  }, []);

  function accept() {
    document.cookie = 'cookie_consent=accepted; path=/; max-age=31536000; SameSite=Lax';
    setShow(false);
  }

  function refuse() {
    document.cookie = 'cookie_consent=refused; path=/; max-age=31536000; SameSite=Lax';
    setShow(false);
    // Desactiver Vercel Analytics en supprimant le flag
    window.localStorage?.setItem('va_disabled', '1');
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t border-gray-200 shadow-lg p-4 sm:p-5">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <p className="text-sm text-gray-700 flex-1">
          Nous utilisons des cookies analytiques pour ameliorer votre experience.
          Aucune donnee personnelle n&apos;est partagee avec des tiers.{' '}
          <a href="/mentions-legales" className="underline text-gray-900">
            En savoir plus
          </a>
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={refuse}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Refuser
          </button>
          <button
            onClick={accept}
            className="px-4 py-2 text-sm bg-[#1A1A1A] text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}
