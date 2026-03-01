'use client';

import { Store, Info, Building2, Clock, MapPin } from 'lucide-react';
import {
  getCandidatureWindowStatus,
  getDurationLabel,
} from '@/app/admin/components/ShowroomFichePreview';
import type { Showroom, ShowroomCommissionOption, Badge } from '@/lib/supabase';
import { BadgeIcon } from '@/app/admin/components/BadgeIcon';

function rentPeriodLabel(period: string | null): string {
  if (period === 'week') return '/sem.';
  if (period === 'one_off') return ' unique';
  return '/mois';
}

function formatShowroomDates(start: string | null, end: string | null): string {
  try {
    const d1 = start ? new Date(start).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    const d2 = end ? new Date(end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    if (d1 && d2) return `du ${d1} au ${d2}`;
    if (d1) return `à partir du ${d1}`;
    if (d2) return `jusqu'au ${d2}`;
    return '';
  } catch {
    return '';
  }
}

/** Partie date seule pour affichage en gras : "15 Mars". */
function formatPostulerAvantDate(closeDate: string | null): string {
  if (!closeDate?.trim()) return '';
  try {
    const d = new Date(closeDate);
    const day = d.getDate();
    const month = d.toLocaleDateString('fr-FR', { month: 'long' });
    const year = d.getFullYear();
    const thisYear = new Date().getFullYear();
    const monthCap = month.charAt(0).toUpperCase() + month.slice(1);
    return year !== thisYear ? `${day} ${monthCap} ${year}` : `${day} ${monthCap}`;
  } catch {
    return '';
  }
}

/** Partie date seule pour "à partir du" : "1 Avril". */
function formatPostulerÀPartirDate(openFrom: string | null): string {
  if (!openFrom?.trim()) return '';
  try {
    const d = new Date(openFrom);
    const day = d.getDate();
    const month = d.toLocaleDateString('fr-FR', { month: 'long' });
    const monthCap = month.charAt(0).toUpperCase() + month.slice(1);
    return `${day} ${monthCap}`;
  } catch {
    return '';
  }
}

/** Format court période exposition : "Avr - Juin" (une ligne, labels fins). */
function formatExpoShort(start: string | null, end: string | null): string {
  if (!start?.trim() && !end?.trim()) return '';
  try {
    const s = start?.trim() ? new Date(start) : null;
    const e = end?.trim() ? new Date(end) : null;
    if (!s && !e) return '';
    const monthShort = (d: Date) => d.toLocaleDateString('fr-FR', { month: 'short' });
    const cap = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
    if (s && e) {
      const yS = s.getFullYear();
      const yE = e.getFullYear();
      if (yS === yE) return `${cap(monthShort(s))} - ${cap(monthShort(e))}`;
      return `${cap(monthShort(s))} ${yS} - ${cap(monthShort(e))} ${yE}`;
    }
    if (s) return `À partir de ${cap(monthShort(s))}`;
    return e ? `Jusqu'à ${cap(monthShort(e))}` : '';
  } catch {
    return '';
  }
}

/** Durée courte pour sous-texte : "3 mois", "2 semaines". */
function durationShort(start: string | null, end: string | null): string {
  const full = getDurationLabel(start, end);
  if (!full) return '';
  return full.replace(/^Durée :\s*/i, '').trim() || full;
}

export type BoutiqueCardProps = {
  /** Données boutique (mêmes champs Supabase partout : Discover + aperçu config). */
  showroom: Pick<
    Showroom,
    | 'id'
    | 'name'
    | 'city'
    | 'description'
    | 'avatar_url'
    | 'image_url'
    | 'shop_type'
    | 'is_permanent'
    | 'start_date'
    | 'end_date'
    | 'candidature_open_from'
    | 'candidature_open_to'
  >;
  /** Options de rémunération (showroom_commission_options). */
  commissionOptions?: ShowroomCommissionOption[];
  listingTitle?: string | null;
  listingDates?: { partnership_start_date: string | null; partnership_end_date: string | null; application_open_date: string | null; application_close_date: string | null } | null;
  badges?: Badge[];
  /** Bloc d’action contextuel : bouton "Candidater (1 crédit)" côté marque, "Modifier mon profil" côté boutique, etc. */
  children: React.ReactNode;
};

/**
 * Fiche boutique unique - même rendu sur "Vendre mes produits" (marque) et sur l’aperçu du dashboard boutique.
 * Les mêmes champs Supabase sont affichés (nom, description, photos, localisation, périodes, options).
 */
/** Type effectif : shop_type prioritaire, sinon déduit de is_permanent pour rétrocompat. */
function getEffectiveShopType(s: BoutiqueCardProps['showroom']): 'permanent' | 'ephemeral' {
  if (s.shop_type === 'ephemeral' || s.shop_type === 'permanent') return s.shop_type;
  return s.is_permanent === false ? 'ephemeral' : 'permanent';
}

export function BoutiqueCard({ showroom, commissionOptions = [], listingTitle, listingDates, badges = [], urgencyDays = null, matchingBadgeSlugs = [], selectedBadgeSlugs, children }: BoutiqueCardProps) {
  const s = showroom;
  const shopType = getEffectiveShopType(s);
  const openFrom = listingDates ? listingDates.application_open_date : (s.candidature_open_from ?? null);
  const openTo = listingDates ? listingDates.application_close_date : (s.candidature_open_to ?? null);
  const partnershipStart = listingDates ? listingDates.partnership_start_date : s.start_date;
  const partnershipEnd = listingDates ? listingDates.partnership_end_date : s.end_date;
  const candidatureStatus = getCandidatureWindowStatus(openFrom, openTo);
  const showUrgencyDot = urgencyDays != null && urgencyDays <= 7 && candidatureStatus === 'open';

  return (
    <article className="rounded-[12px] bg-white overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-shadow duration-200">
      <div className="aspect-[4/3] bg-neutral-50/80 flex items-center justify-center relative">
        {s.image_url?.trim() ? (
          <img src={s.image_url.trim()} alt="" className="w-full h-full object-cover" />
        ) : (
          <Store className="h-12 w-12 text-neutral-300" />
        )}
        {showUrgencyDot && (
          <span
            className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: urgencyDays != null && urgencyDays < 3 ? '#dc2626' : '#eab308' }}
            title={urgencyDays !== null ? `Ferme dans ${urgencyDays} jour${urgencyDays > 1 ? 's' : ''}` : undefined}
            aria-label={urgencyDays !== null ? `Candidatures ferment dans ${urgencyDays} jours` : undefined}
          />
        )}
        {(() => {
          const toShow = selectedBadgeSlugs?.length
            ? badges.filter((b) => selectedBadgeSlugs.includes(b.slug)).slice(0, 5)
            : badges.slice(0, 5);
          return toShow.length > 0 ? (
            <div className="absolute top-2 left-2 right-2 flex flex-wrap items-start justify-start gap-1.5">
              {toShow.map((b) => (
                <span
                  key={b.id}
                  className="inline-flex items-center gap-1 rounded-full bg-white/95 backdrop-blur px-2 py-0.5 text-xs font-medium text-neutral-800 shadow-sm"
                >
                  <BadgeIcon badge={b} className="w-4 h-3 shrink-0 inline-block" />
                  <span>{b.label}</span>
                </span>
              ))}
            </div>
          ) : null;
        })()}
      </div>
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-full bg-neutral-100 shrink-0 overflow-hidden flex items-center justify-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            {s.avatar_url?.trim() ? (
              <img src={s.avatar_url.trim()} alt="" className="w-full h-full object-cover" />
            ) : (
              <Store className="h-5 w-5 text-neutral-400" aria-hidden />
            )}
          </div>
          <div className="min-w-0 flex-1 w-full text-left">
            {listingTitle?.trim() && (
              <p className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">{listingTitle.trim()}</p>
            )}
            <h3 className="font-semibold text-neutral-900 text-[15px]">{s.name || 'Nom de la boutique'}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {shopType === 'permanent' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
                  <Building2 className="h-3 w-3" aria-hidden />
                  Boutique permanente
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                  <Clock className="h-3 w-3" aria-hidden />
                  Lieu éphémère
                </span>
              )}
              {s.city && (
                <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
                  <MapPin className="h-3 w-3" aria-hidden />
                  {s.city}
                </span>
              )}
            </div>
          </div>
        </div>
        {s.description && <p className="text-sm text-neutral-600 mt-3 line-clamp-2 font-light leading-relaxed text-left">{s.description}</p>}
        {!s.description?.trim() && (
          <p className="text-sm text-neutral-400 mt-3 italic font-light text-left">Description de la boutique…</p>
        )}
        {shopType === 'ephemeral' && (s.start_date || s.end_date) && (
          <p className="text-xs text-neutral-500 mt-1.5 text-left">
            Ouverture du lieu : {formatShowroomDates(s.start_date, s.end_date)}
          </p>
        )}
        {((openFrom || openTo) || (partnershipStart || partnershipEnd)) && (
          <p className="mt-3 text-[13px] font-light text-neutral-600 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            {(openFrom || openTo) && (
              <>
                <span aria-hidden>✍️</span>
                <span className="font-normal text-neutral-500">{openTo ? 'Av. le ' : 'À partir du '}</span>
                <span className="font-semibold text-neutral-900">{openTo ? formatPostulerAvantDate(openTo) : formatPostulerÀPartirDate(openFrom)}</span>
                {candidatureStatus === 'open' && urgencyDays != null && urgencyDays <= 7 && urgencyDays >= 0 && (
                  <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">Bientôt fini</span>
                )}
              </>
            )}
            {(openFrom || openTo) && (partnershipStart || partnershipEnd) && <span className="text-neutral-300">|</span>}
            {(partnershipStart || partnershipEnd) && (
              <>
                <span aria-hidden>🏠</span>
                <span className="font-semibold text-neutral-900">{formatExpoShort(partnershipStart, partnershipEnd)}</span>
              </>
            )}
          </p>
        )}
        {commissionOptions.length > 0 && (
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-light text-neutral-600">
            {commissionOptions.slice(0, 3).map((o) => (
              <span key={o.id} className="inline-flex items-center gap-1">
                {o.rent != null && o.rent > 0 && <span className="font-medium text-neutral-800">{o.rent}€{rentPeriodLabel(o.rent_period)}</span>}
                {o.commission_percent != null && <span className="font-medium text-neutral-800">{o.commission_percent}%</span>}
                {o.description?.trim() && (
                  <Info className="h-3 w-3 text-neutral-400 cursor-help shrink-0" title={o.description} aria-label="Détails" strokeWidth={1.5} />
                )}
              </span>
            ))}
          </p>
        )}
        {false && (
          <p className="mt-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5 hidden">
            {0 === 0
              ? 'Dernier jour pour candidater'
              : 1 === 1
                ? 'Plus qu’un jour avant la fin des candidatures'
                : 'Plus que X jours'}
          </p>
        )}
        <div className="mt-5 flex flex-col gap-2">
          {children}
        </div>
      </div>
    </article>
  );
}
