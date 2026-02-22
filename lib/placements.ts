import type { PlacementInitiator } from '@/lib/supabase';

export const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  active: 'Actif',
  sold: 'Vendu',
  returned: 'Retourné',
};

/** Badge : qui a initié la demande. Affiche le nom de la marque ou du showroom si fournis. */
export function getInitiatorBadgeLabel(
  initiatedBy: PlacementInitiator | null | undefined,
  brandName?: string | null,
  showroomName?: string | null
): string {
  if (initiatedBy === 'showroom') return showroomName ?? 'Demande boutique';
  return brandName ?? 'Demande marque';
}

/**
 * Libellé du statut. Si pending, affiche "En attente chez [nom]" (marque ou showroom qui doit répondre).
 */
export function getStatusDisplayLabel(
  status: string | null | undefined,
  initiatedBy: PlacementInitiator | null | undefined,
  brandName?: string | null,
  showroomName?: string | null
): string {
  const s = status ?? 'pending';
  if (s !== 'pending') return STATUS_LABELS[s] ?? s;
  if (initiatedBy === 'showroom') return `En attente chez ${brandName ?? 'la marque'}`;
  return `En attente chez ${showroomName ?? 'la boutique'}`;
}
