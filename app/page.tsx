'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Badge } from '@/lib/supabase';
import { Store, Sparkles, Calendar, MessageCircle, Zap } from 'lucide-react';
import { BadgeIcon } from '@/app/admin/components/BadgeIcon';

const BADGE_DUPLICATES = 3;

const FOOTER_STEPS = [
  { icon: Calendar, label: 'Postulez', tooltip: 'Parcourez les lieux, choisissez vos dates et envoyez votre candidature en un clic.' },
  { icon: MessageCircle, label: 'Échangez', tooltip: 'Discutez directement avec le lieu via la messagerie intégrée et validez les conditions.' },
  { icon: Zap, label: 'Exposez', tooltip: 'Une fois accepté, exposez vos produits et développez votre présence en boutique.' },
] as const;

export default function HomePage() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u ? { id: u.id } : null));
  }, []);

  useEffect(() => {
    supabase
      .from('badges')
      .select('id, slug, label, icon, sort_order')
      .order('sort_order', { ascending: true })
      .then(({ data }) => setBadges((data as Badge[]) ?? []));
  }, []);

  return (
    <div
      className="h-screen overflow-hidden flex flex-col"
      style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(251,251,253,0.98), #FBFBFD)' }}
    >
      {/* Barre de menu ultra-fine - style Papier Kraft */}
      <header className="nav-kraft shrink-0 flex items-center justify-between px-4 py-2.5 sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-[#1A1A1A] font-semibold tracking-tight kraftplace-wordmark text-base">Kraftplace</span>
          <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider text-[#5c4a38] bg-[#c9b896]/40 border border-[#C4B09A]">
            Beta
          </span>
        </Link>
        <Link
          href={user ? '/admin' : '/login'}
          className="text-xs font-medium text-[#1A1A1A]/90 hover:text-[#1A1A1A] transition-colors"
        >
          Connexion
        </Link>
      </header>

      {/* Contenu central - hero + cartes */}
      <main className="flex-1 flex flex-col min-h-0">
        <section className="flex-1 flex flex-col items-center justify-center px-4 py-6 min-h-0">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-neutral-900 tracking-tight max-w-2xl mx-auto leading-[1.2] text-center">
            <span className="font-bold">Kraftplace.</span> Le trait d&apos;union entre <span className="font-bold text-neutral-900">lieux engagés</span> et <span className="font-bold text-neutral-900">marques éthiques</span>.
          </h1>
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch justify-center gap-6 sm:gap-12 max-w-xl w-full">
            <Link
              href={user ? '/admin' : '/signup?type=brand'}
              className="flex flex-col items-center justify-center text-center rounded-2xl border border-black/[0.06] bg-transparent py-6 px-6 sm:py-8 sm:px-8 transition-all duration-200 hover:border-neutral-900 hover:bg-[#FBFBFD] focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
            >
              <Sparkles className="h-10 w-10 sm:h-11 sm:w-11 text-neutral-700 mb-3" strokeWidth={1} aria-hidden />
              <span className="text-base sm:text-lg font-semibold text-neutral-900 tracking-tight">Marque</span>
              <p className="mt-1.5 text-[12px] font-normal text-neutral-400 leading-snug max-w-[180px]">
                Trouvez des boutiques qui valorisent votre artisanat.
              </p>
            </Link>
            <Link
              href={user ? '/admin' : '/signup?type=showroom'}
              className="flex flex-col items-center justify-center text-center rounded-2xl border border-black/[0.06] bg-transparent py-6 px-6 sm:py-8 sm:px-8 transition-all duration-200 hover:border-neutral-900 hover:bg-[#FBFBFD] focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
            >
              <Store className="h-10 w-10 sm:h-11 sm:w-11 text-neutral-700 mb-3" strokeWidth={1} aria-hidden />
              <span className="text-base sm:text-lg font-semibold text-neutral-900 tracking-tight">Boutique</span>
              <p className="mt-1.5 text-[12px] font-normal text-neutral-400 leading-snug max-w-[180px]">
                Sourcez des créateurs qui enrichissent votre univers éthique.
              </p>
            </Link>
          </div>
        </section>

        {/* Footer-Nav : 3 mots-clés avec tooltips */}
        <nav className="shrink-0 flex items-center justify-center gap-2 sm:gap-4 px-4 py-3 border-t border-black/[0.06] bg-white/40" aria-label="Comment ça marche">
          {FOOTER_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <span key={step.label} className="inline-flex items-center gap-2">
                {i > 0 && <span className="text-neutral-300 select-none" aria-hidden>·</span>}
                <span
                  tabIndex={0}
                  className="group relative inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-neutral-500 hover:text-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/30 focus-visible:ring-offset-1 rounded-md transition-colors cursor-default"
                  aria-label={`${step.label}. ${step.tooltip}`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1} aria-hidden />
                  <span>{step.label}</span>
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg bg-neutral-900 text-white text-[10px] font-normal leading-snug opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-visible:opacity-100 group-focus-visible:visible transition-all duration-150 w-[180px] max-w-[calc(100vw-2rem)] text-center z-10 shadow-lg">
                    {step.tooltip}
                  </span>
                </span>
              </span>
            );
          })}
        </nav>

        {/* Bandeau badges - très fin et discret en bas */}
        {badges.length > 0 && (
          <div className="shrink-0 h-9 border-t border-black/[0.06] bg-white/30 overflow-hidden flex items-center">
            <div className="flex w-max animate-scroll-badges items-center gap-3 px-4">
              {Array.from({ length: BADGE_DUPLICATES }).map((_, block) => (
                <div key={block} className="flex items-center gap-3 shrink-0">
                  {badges.map((badge) => (
                    <span
                      key={`${block}-${badge.id}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2 py-1 text-[11px] font-medium text-neutral-600 border border-black/[0.05] shrink-0"
                      aria-hidden
                    >
                      <BadgeIcon badge={badge} className="w-3.5 h-3 shrink-0 inline-block" />
                      <span>{badge.label}</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
