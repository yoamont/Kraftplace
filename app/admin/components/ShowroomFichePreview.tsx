'use client';

import Link from 'next/link';
import type { ShowroomCommissionOption, Badge } from '@/lib/supabase';
import { BoutiqueCard } from './cards/BoutiqueCard';

type RentPeriodValue = 'week' | 'month' | 'one_off';

type OptionForm = {
  rent: string;
  rentPeriod: RentPeriodValue;
  commissionPercent: string;
  description: string;
};

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

/** Calcule et retourne un libellé de durée entre deux dates (ex: "Durée : 1 mois", "Durée : 2 semaines"). */
export function getDurationLabel(start: string | null | undefined, end: string | null | undefined): string {
  const s = start?.trim();
  const e = end?.trim();
  if (!s || !e) return '';
  try {
    const d1 = new Date(s);
    const d2 = new Date(e);
    if (d2 < d1) return '';
    const days = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (days <= 0) return '';
    if (days === 1) return 'Durée : 1 jour';
    if (days < 8) return `Durée : ${days} jours`;
    if (days <= 21) return `Durée : ${Math.round(days / 7)} semaine${Math.round(days / 7) > 1 ? 's' : ''}`;
    if (days <= 45) return `Durée : 1 mois`;
    if (days <= 365) return `Durée : ${Math.round(days / 30)} mois`;
    return `Durée : ${Math.round(days / 365)} an${Math.round(days / 365) > 1 ? 's' : ''}`;
  } catch {
    return '';
  }
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

export type ShopType = 'permanent' | 'ephemeral';

export type ShowroomFichePreviewProps = {
  name: string;
  city: string;
  description: string;
  avatarUrl?: string;
  imageUrl: string;
  /** Type d'établissement (identité de la boutique). */
  shopType?: ShopType;
  /** Pour lieu éphémère : dates d'existence du lieu (affichées sur la carte). */
  existenceStartDate?: string;
  existenceEndDate?: string;
  /** Période d'ouverture des candidatures (vide = toujours ouvert) */
  candidatureOpenFrom?: string;
  candidatureOpenTo?: string;
  commissionOptions: OptionForm[];
  /** Badges de valeurs (aperçu config). */
  badges?: Badge[];
  /** Si true (aperçu côté boutique), affiche "Modifier mon profil" au lieu de Candidater/À venir/Terminé */
  ownerView?: boolean;
};

/** Aperçu de la fiche boutique (utilise BoutiqueCard). Côté config boutique : action = "Modifier mon profil" / Candidater. Les infos juridiques restent confidentielles. */
export function ShowroomFichePreview({ name, city, description, avatarUrl, imageUrl, shopType = 'permanent', existenceStartDate, existenceEndDate, candidatureOpenFrom, candidatureOpenTo, commissionOptions, badges = [], ownerView = false }: ShowroomFichePreviewProps) {
  const candidatureStatus = getCandidatureWindowStatus(candidatureOpenFrom, candidatureOpenTo);
  const showroomPreview = {
    id: 0,
    name: name || 'Nom de la boutique',
    city: city?.trim() || null,
    description: description?.trim() || null,
    avatar_url: avatarUrl?.trim() || null,
    image_url: imageUrl?.trim() || null,
    shop_type: shopType,
    is_permanent: shopType === 'permanent',
    start_date: (shopType === 'ephemeral' && existenceStartDate?.trim()) ? existenceStartDate.trim() : null,
    end_date: (shopType === 'ephemeral' && existenceEndDate?.trim()) ? existenceEndDate.trim() : null,
    candidature_open_from: candidatureOpenFrom?.trim() || null,
    candidature_open_to: candidatureOpenTo?.trim() || null,
  };
  const optionsPreview: ShowroomCommissionOption[] = commissionOptions
    .filter((o) => o.rent.trim() || o.commissionPercent.trim() || o.description.trim())
    .slice(0, 3)
    .map((o, i) => ({
      id: i + 1,
      showroom_id: 0,
      sort_order: i,
      rent: (() => { const n = parseFloat(o.rent.replace(',', '.')); return Number.isNaN(n) ? null : n; })(),
      rent_period: o.rentPeriod,
      commission_percent: (() => { const n = parseInt(o.commissionPercent, 10); return Number.isNaN(n) ? null : n; })(),
      description: o.description?.trim() || null,
    }));

  return (
    <BoutiqueCard showroom={showroomPreview} commissionOptions={optionsPreview} badges={badges}>
      {ownerView ? (
        <Link
          href="/admin/showroom-config"
          className="flex items-center justify-center w-full py-2.5 rounded-xl text-sm font-medium bg-neutral-900 text-white hover:bg-neutral-800 transition-colors duration-150"
        >
          Modifier mon profil
        </Link>
      ) : (
        <div
          className={`flex items-center justify-center w-full py-2.5 rounded-xl text-sm font-medium ${
            candidatureStatus === 'open'
              ? 'bg-neutral-900 text-white'
              : candidatureStatus === 'upcoming'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-neutral-200 text-neutral-500'
          }`}
        >
          {candidatureStatus === 'open' ? 'Candidater' : candidatureStatus === 'upcoming' ? 'À venir' : 'Terminé'}
        </div>
      )}
    </BoutiqueCard>
  );
}
