'use client';

import { useState } from 'react';
import { Share2, Check, Link as LinkIcon } from 'lucide-react';

type ShareButtonProps = {
  title: string;
  text: string;
  url: string;
};

export function ShareButton({ title, text, url }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    // Web Share API (mobile + navigateurs modernes)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // L'utilisateur a annulé ou l'API a échoué — fallback copie
      }
    }

    // Fallback : copier le lien
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Dernier fallback
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-all duration-150"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4 text-green-600" />
          <span className="text-green-700">Lien copié !</span>
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4" />
          <span>Partager</span>
        </>
      )}
    </button>
  );
}
