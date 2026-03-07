/**
 * Génère un slug URL à partir du nom de la boutique (pour URLs partageables).
 * Ex. "Boutique Pilote Marais" → "boutique-pilote-marais"
 */
export function slugFromShowroomName(name: string | null | undefined): string {
  if (!name || typeof name !== 'string') return 'boutique';
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'boutique';
}

/**
 * Chemin canonique de l'annonce partageable : /annonce/[slug-boutique]/[id-annonce]
 */
export function getAnnoncePath(showroomName: string | null | undefined, listingId: number): string {
  const slug = slugFromShowroomName(showroomName);
  return `/annonce/${slug}/${listingId}`;
}
