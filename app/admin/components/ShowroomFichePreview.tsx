'use client';

import { Store, Info } from 'lucide-react';

type RentPeriodValue = 'week' | 'month' | 'one_off';

type OptionForm = {
  rent: string;
  rentPeriod: RentPeriodValue;
  commissionPercent: string;
  description: string;
};

function rentPeriodLabel(period: string): string {
  if (period === 'week') return '/sem.';
  if (period === 'one_off') return ' unique';
  return '/mois';
}

function optionBadgeLabel(opt: OptionForm): string {
  const parts: string[] = [];
  const rent = opt.rent.trim() ? parseFloat(opt.rent.replace(',', '.')) : null;
  if (rent != null && !Number.isNaN(rent)) {
    parts.push(`${rent}€${rentPeriodLabel(opt.rentPeriod)}`);
  }
  const commission = opt.commissionPercent.trim() ? parseInt(opt.commissionPercent, 10) : null;
  if (commission != null && !Number.isNaN(commission)) {
    parts.push(`${commission} %`);
  }
  return parts.join(' ');
}

function formatDateRange(start: string, end: string): string {
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

export type CandidatureWindowStatus = 'open' | 'upcoming' | 'ended';

export function getCandidatureWindowStatus(openFrom: string | null | undefined, openTo: string | null | undefined): CandidatureWindowStatus {
  const from = openFrom?.trim();
  const to = openTo?.trim();
  if (!from && !to) return 'open';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;
  if (fromDate) fromDate.setHours(0, 0, 0, 0);
  if (toDate) toDate.setHours(0, 0, 0, 0);
  if (fromDate && toDate) {
    if (today < fromDate) return 'upcoming';
    if (today > toDate) return 'ended';
    return 'open';
  }
  if (fromDate) return today < fromDate ? 'upcoming' : 'open';
  if (toDate) return today > toDate ? 'ended' : 'open';
  return 'open';
}

/** Nombre de jours restants jusqu'à la date de clôture (inclus). Retourne null si pas de clôture ou déjà terminé. */
export function getCandidatureDaysLeft(openTo: string | null | undefined): number | null {
  const to = openTo?.trim();
  if (!to) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const toDate = new Date(to);
  toDate.setHours(0, 0, 0, 0);
  if (today > toDate) return null;
  const diff = Math.ceil((toDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

/** Libellé de la période de candidatures (exporté pour réutilisation sur la page Discover). */
export function formatCandidaturePeriodLabel(openFrom: string | undefined, openTo: string | undefined): string {
  const from = openFrom?.trim();
  const to = openTo?.trim();
  if (!from && !to) return '';
  try {
    const d1 = from ? new Date(from).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    const d2 = to ? new Date(to).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    if (d1 && d2) return `Candidatures du ${d1} au ${d2}`;
    if (d1) return `Candidatures à partir du ${d1}`;
    if (d2) return `Candidatures jusqu'au ${d2}`;
  } catch {}
  return '';
}

export type ShowroomFichePreviewProps = {
  name: string;
  city: string;
  description: string;
  avatarUrl?: string;
  imageUrl: string;
  isPermanent?: boolean;
  startDate?: string;
  endDate?: string;
  /** Période d'ouverture des candidatures (vide = toujours ouvert) */
  candidatureOpenFrom?: string;
  candidatureOpenTo?: string;
  commissionOptions: OptionForm[];
};

/** Aperçu de la fiche boutique telle que vue par les marques dans "Vendre mes produits". Les infos juridiques / contact (raison sociale, représentant, email, tél) sont confidentielles et ne sont pas affichées aux marques. */
export function ShowroomFichePreview({ name, city, description, avatarUrl, imageUrl, isPermanent = true, startDate = '', endDate = '', candidatureOpenFrom, candidatureOpenTo, commissionOptions }: ShowroomFichePreviewProps) {
  const candidatureStatus = getCandidatureWindowStatus(candidatureOpenFrom, candidatureOpenTo);
  const optionsWithContent = commissionOptions.filter(
    (o) => o.rent.trim() || o.commissionPercent.trim() || o.description.trim()
  );
  const ephemeralLabel = !isPermanent && (startDate || endDate) ? formatDateRange(startDate, endDate) : null;
  const candidaturePeriodLabel = formatCandidaturePeriodLabel(candidatureOpenFrom ?? undefined, candidatureOpenTo ?? undefined);
  const daysLeft = getCandidatureDaysLeft(candidatureOpenTo);
  const showFomo = candidatureStatus === 'open' && daysLeft !== null && daysLeft <= 7;

  return (
    <article className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
      <div className="aspect-[4/3] bg-neutral-100 flex items-center justify-center">
        {imageUrl.trim() ? (
          <img src={imageUrl.trim()} alt="" className="w-full h-full object-cover" />
        ) : (
          <Store className="h-12 w-12 text-neutral-300" />
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-3">
          {avatarUrl?.trim() && (
            <div className="w-12 h-12 rounded-full bg-neutral-100 shrink-0 overflow-hidden border border-neutral-200">
              <img src={avatarUrl.trim()} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-semibold text-neutral-900">{name || 'Nom de la boutique'}</h3>
            {city.trim() && <p className="text-sm text-neutral-500 mt-0.5">{city}</p>}
            <p className="text-xs text-neutral-500 mt-0.5">
              {isPermanent ? 'Lieu permanent' : ephemeralLabel ? `Éphémère · ${ephemeralLabel}` : 'Éphémère'}
            </p>
            {(startDate?.trim() || endDate?.trim()) && (
              <p className="text-xs text-neutral-500 mt-0.5">
                Partenariat : {formatDateRange(startDate ?? '', endDate ?? '')}
              </p>
            )}
          </div>
        </div>
        {description.trim() ? (
          <p className="text-sm text-neutral-600 mt-2 line-clamp-2">{description}</p>
        ) : (
          <p className="text-sm text-neutral-400 mt-2 italic">Description de la boutique…</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {optionsWithContent.length > 0
            ? optionsWithContent.slice(0, 3).map((o, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-neutral-900 shadow-sm"
                >
                  {optionBadgeLabel(o) && <span>{optionBadgeLabel(o)}</span>}
                  {o.description?.trim() && (
                    <span
                      className="text-neutral-400 hover:text-neutral-600 cursor-help"
                      title={o.description}
                      aria-label="Voir les conditions"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </span>
                  )}
                </span>
              ))
            : null}
        </div>
        {candidaturePeriodLabel && (
          <p className="mt-2 text-xs text-neutral-500">
            {candidaturePeriodLabel}
          </p>
        )}
        {showFomo && (
          <p className="mt-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5">
            {daysLeft === 0
              ? 'Dernier jour pour candidater'
              : daysLeft === 1
                ? 'Plus qu’un jour avant la fin des candidatures'
                : `Plus que ${daysLeft} jours avant la fin des candidatures`}
          </p>
        )}
        <div
          className={`mt-4 w-full py-2.5 rounded-lg text-sm font-medium text-center ${
            candidatureStatus === 'open'
              ? 'bg-neutral-900 text-white'
              : candidatureStatus === 'upcoming'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-neutral-200 text-neutral-500'
          }`}
        >
          {candidatureStatus === 'open' ? 'Candidater' : candidatureStatus === 'upcoming' ? 'À venir' : 'Terminé'}
        </div>
      </div>
    </article>
  );
}
