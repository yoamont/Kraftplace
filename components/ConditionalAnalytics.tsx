'use client';

import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';

/**
 * Charge Vercel Analytics uniquement si l'utilisateur a accepte les cookies.
 */
export default function ConditionalAnalytics() {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    const consent = document.cookie
      .split('; ')
      .find((c) => c.startsWith('cookie_consent=accepted'));
    setConsented(!!consent);

    // Re-check quand le cookie change (apres clic sur le bandeau)
    const interval = setInterval(() => {
      const c = document.cookie
        .split('; ')
        .find((c) => c.startsWith('cookie_consent=accepted'));
      if (c) {
        setConsented(true);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!consented) return null;
  return <Analytics />;
}
