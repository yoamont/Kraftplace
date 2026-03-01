'use client';

import type { Badge } from '@/lib/supabase';

/** Drapeau français (tricolore) en SVG pour un rendu fiable. */
function FrenchFlagSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 9 6" className={className} aria-hidden role="img">
      <rect width="3" height="6" fill="#002395" />
      <rect x="3" width="3" height="6" fill="#fff" />
      <rect x="6" width="3" height="6" fill="#ED2939" />
    </svg>
  );
}

/** Drapeau européen (étoiles sur fond bleu) en SVG pour un rendu fiable. */
function EUFlagSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 30" className={className} aria-hidden role="img">
      <rect width="30" height="30" fill="#003399" rx="1" />
      {[...Array(12)].map((_, i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180);
        const cx = 15 + 8 * Math.cos(angle);
        const cy = 15 + 8 * Math.sin(angle);
        return <circle key={i} cx={cx} cy={cy} r="2" fill="#FFCC00" />;
      })}
    </svg>
  );
}

type BadgeIconProps = {
  badge: Pick<Badge, 'slug' | 'icon'>;
  className?: string;
};

/**
 * Affiche l’icône d’un badge. Pour Made in France et Made in Europe,
 * utilise des SVG pour un rendu correct des drapeaux (les emojis Unicode
 * sont souvent mal affichés).
 */
export function BadgeIcon({ badge, className = 'w-4 h-3 inline-block' }: BadgeIconProps) {
  if (badge.slug === 'made-in-france') {
    return <FrenchFlagSvg className={className} />;
  }
  if (badge.slug === 'made-in-europe') {
    return <EUFlagSvg className={className} />;
  }
  if (badge.icon) {
    return <span className={className} aria-hidden style={{ fontSize: '1em', lineHeight: 1 }}>{badge.icon}</span>;
  }
  return null;
}
