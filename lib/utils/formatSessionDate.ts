/**
 * Format court session partenariat : "Avr - Juin 2026" (année en fin si même année).
 */
export function formatSessionDate(start: string | null, end: string | null): string {
  if (!start?.trim() && !end?.trim()) return '-';
  try {
    const s = start?.trim() ? new Date(start) : null;
    const e = end?.trim() ? new Date(end) : null;
    if (!s && !e) return '-';
    const monthShort = (d: Date) => d.toLocaleDateString('fr-FR', { month: 'short' });
    const cap = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
    if (s && e) {
      const yS = s.getFullYear();
      const yE = e.getFullYear();
      if (yS === yE) return `${cap(monthShort(s))} - ${cap(monthShort(e))} ${yE}`;
      return `${cap(monthShort(s))} ${yS} - ${cap(monthShort(e))} ${yE}`;
    }
    if (s) return `À partir de ${cap(monthShort(s))} ${s.getFullYear()}`;
    return e ? `Jusqu'à ${cap(monthShort(e))} ${e.getFullYear()}` : '-';
  } catch {
    return '-';
  }
}
