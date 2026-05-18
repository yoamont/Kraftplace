'use client';

import Link from 'next/link';
import { Store, MapPin, ArrowRight, Building2, Clock } from 'lucide-react';
import type { Showroom, Badge } from '@/lib/supabase';
import { BadgeIcon } from '@/app/admin/components/BadgeIcon';

export type PublicShowroomCardProps = {
  showroom: Pick<Showroom, 'id' | 'name' | 'city' | 'description' | 'avatar_url' | 'image_url' | 'shop_type' | 'is_permanent'>;
  badges?: Badge[];
  actions?: React.ReactNode;
};

function getEffectiveType(s: PublicShowroomCardProps['showroom']): 'permanent' | 'ephemeral' {
  if (s.shop_type === 'ephemeral' || s.shop_type === 'permanent') return s.shop_type;
  return s.is_permanent === false ? 'ephemeral' : 'permanent';
}

export function PublicShowroomCard({ showroom, badges = [], actions }: PublicShowroomCardProps) {
  const shopType = getEffectiveType(showroom);

  const inner = (
    <>
      <div className="aspect-[4/3] bg-neutral-100 relative overflow-hidden">
        {showroom.image_url?.trim() ? (
          <img
            src={showroom.image_url.trim()}
            alt={showroom.name ?? ''}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-300">
            <Store className="h-10 w-10" />
          </div>
        )}
        {badges.length > 0 && (
          <div className="absolute top-2 left-2 right-2 flex flex-wrap gap-1.5">
            {badges.slice(0, 5).map((b) => (
              <span
                key={b.id}
                className="inline-flex items-center gap-1 rounded-full bg-white/95 backdrop-blur px-2 py-0.5 text-[11px] font-medium text-neutral-800 shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
              >
                <BadgeIcon badge={b} className="w-4 h-3 shrink-0 inline-block" />
                <span>{b.label}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-neutral-100 shrink-0 overflow-hidden flex items-center justify-center">
            {showroom.avatar_url?.trim() ? (
              <img src={showroom.avatar_url.trim()} alt="" className="w-full h-full object-cover" />
            ) : (
              <Store className="h-5 w-5 text-neutral-400" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-neutral-900 truncate text-[15px]">{showroom.name || 'Boutique'}</h2>
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              {shopType === 'permanent' ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500">
                  <Building2 className="h-3 w-3" /> Permanente
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
                  <Clock className="h-3 w-3" /> Éphémère
                </span>
              )}
              {showroom.city && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500">
                  <MapPin className="h-3 w-3" /> {showroom.city}
                </span>
              )}
            </div>
          </div>
        </div>

        {showroom.description?.trim() && (
          <p className="mt-2 text-sm text-neutral-600 line-clamp-2 leading-relaxed">
            {showroom.description.trim()}
          </p>
        )}

        {!actions && (
          <div className="mt-auto pt-3">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 group-hover:text-neutral-900 transition-colors">
              Voir la boutique
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        )}
      </div>
    </>
  );

  if (actions) {
    return (
      <div className="group rounded-2xl bg-white overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-200 flex flex-col">
        <Link href={`/boutique/${showroom.id}`} className="flex flex-col flex-1">
          {inner}
        </Link>
        <div className="px-4 pb-4">{actions}</div>
      </div>
    );
  }

  return (
    <Link
      href={`/boutique/${showroom.id}`}
      className="group rounded-2xl bg-white overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-200 flex flex-col"
    >
      {inner}
    </Link>
  );
}
