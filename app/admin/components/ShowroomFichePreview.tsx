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

export type ShowroomFichePreviewProps = {
  name: string;
  city: string;
  description: string;
  avatarUrl?: string;
  imageUrl: string;
  isPermanent?: boolean;
  startDate?: string;
  endDate?: string;
  commissionOptions: OptionForm[];
};

/** Aperçu de la fiche boutique telle que vue par les marques dans "Vendre mes produits". */
export function ShowroomFichePreview({ name, city, description, avatarUrl, imageUrl, isPermanent = true, startDate = '', endDate = '', commissionOptions }: ShowroomFichePreviewProps) {
  const optionsWithContent = commissionOptions.filter(
    (o) => o.rent.trim() || o.commissionPercent.trim() || o.description.trim()
  );
  const ephemeralLabel = !isPermanent && (startDate || endDate) ? formatDateRange(startDate, endDate) : null;

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
        <div className="mt-4 w-full py-2.5 rounded-lg bg-neutral-200 text-neutral-500 text-sm font-medium text-center">
          Candidater
        </div>
      </div>
    </article>
  );
}
