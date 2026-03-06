/**
 * Masque les emails et numéros de téléphone dans un texte
 * tant que la candidature n'est pas acceptée (protection des données).
 */
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(?:\+33|0)[1-9](?:[\s.-]*\d{2}){4}/g;

export function maskEmailAndPhone(text: string | null | undefined): string {
  if (text == null || typeof text !== 'string') return '';
  return text
    .replace(EMAIL_REGEX, '•••@•••.•••')
    .replace(PHONE_REGEX, '••••••••••');
}
