/**
 * Service de vérification SIRET via l'API gratuite api.gouv.fr
 * https://recherche-entreprises.api.gouv.fr/search?q={siret}
 */

const API_BASE = 'https://recherche-entreprises.api.gouv.fr';

export type SiretValidationResult = {
  valid: boolean;
  error?: string;
  /** Nom de l'entreprise (dénomination) */
  companyName?: string;
  /** Adresse du siège */
  address?: string;
  /** SIREN (9 chiffres) */
  siren?: string;
};

/** Réponse possible de l'API recherche-entreprises (structure réelle peut varier) */
type ApiResultItem = {
  siret?: string;
  siren?: string;
  nom_complet?: string;
  denomination?: string;
  denomination_unite_legale?: string;
  adresse?: string;
  siege?: { adresse?: string; numero_voie?: string; type_voie?: string; libelle_voie?: string; code_postal?: string; libelle_commune?: string };
  etat_administratif?: string;
  etatAdministratifUniteLegale?: string;
  [key: string]: unknown;
};

type ApiResponse = {
  results?: ApiResultItem[];
  total_results?: number;
  [key: string]: unknown;
};

function normalizeSiret(s: string): string {
  return s.replace(/\D/g, '').trim();
}

/**
 * Clé de contrôle SIRET : formule de Luhn.
 * On double les chiffres de rang pair en partant de la droite (2e, 4e, 6e…),
 * donc les indices 0, 2, 4, 6, 8, 10, 12 (premier chiffre à gauche = position 14 depuis la droite = pair → doublé).
 */
function siretControlKey(siret: string): boolean {
  const digits = siret.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let n = parseInt(digits[i], 10);
    if (i % 2 === 0) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

function getEtatAdministratif(item: ApiResultItem): string | undefined {
  return item.etat_administratif ?? item.etatAdministratifUniteLegale ?? undefined;
}

function getCompanyName(item: ApiResultItem): string | undefined {
  return (
    item.nom_complet ??
    item.denomination ??
    item.denomination_unite_legale ??
    undefined
  );
}

function getAddress(item: ApiResultItem): string | undefined {
  if (typeof item.adresse === 'string' && item.adresse.trim()) return item.adresse.trim();
  const siege = item.siege;
  if (siege && typeof siege === 'object') {
    const parts = [
      siege.numero_voie,
      siege.type_voie,
      siege.libelle_voie,
      siege.code_postal,
      siege.libelle_commune,
    ].filter(Boolean);
    if (parts.length) return parts.join(' ');
    if (typeof (siege as { adresse?: string }).adresse === 'string') {
      return (siege as { adresse: string }).adresse.trim();
    }
  }
  return undefined;
}

/**
 * Vérifie le SIRET auprès de l'API recherche-entreprises.api.gouv.fr.
 * - Format 14 chiffres + clé de contrôle.
 * - Si l'API retourne etat_administratif, on exige 'A' (actif).
 * - Retourne le nom légal et l'adresse pour enregistrement en base.
 */
export async function validateSiret(siret: string): Promise<SiretValidationResult> {
  const raw = normalizeSiret(siret);
  if (raw.length !== 14) {
    return { valid: false, error: 'Le SIRET doit comporter exactement 14 chiffres.' };
  }
  if (!/^\d{14}$/.test(raw)) {
    return { valid: false, error: 'Le SIRET ne doit contenir que des chiffres.' };
  }
  if (!siretControlKey(raw)) {
    return { valid: false, error: 'Numéro SIRET invalide (clé de contrôle).' };
  }

  let data: ApiResponse;
  try {
    const url = `${API_BASE}/search?q=${encodeURIComponent(raw)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      return { valid: false, error: 'Service de vérification indisponible. Réessayez plus tard.' };
    }
    data = (await res.json()) as ApiResponse;
  } catch {
    return { valid: false, error: 'Impossible de contacter le service de vérification.' };
  }

  const results = Array.isArray(data.results) ? data.results : [];
  const match = results.find(
    (r) => normalizeSiret(String(r.siret ?? '')) === raw || normalizeSiret(String(r.siren ?? '')) === raw.slice(0, 9)
  );
  if (!match) {
    return { valid: false, error: 'SIRET non trouvé dans le registre des entreprises.' };
  }

  const etat = getEtatAdministratif(match);
  if (etat != null && etat !== 'A') {
    return { valid: false, error: 'L\'entreprise n\'est pas en activité (état administratif non actif).' };
  }

  const companyName = getCompanyName(match);
  const address = getAddress(match);
  const siren = match.siren != null ? String(match.siren).replace(/\D/g, '').slice(0, 9) : undefined;

  return {
    valid: true,
    companyName: companyName?.trim() || undefined,
    address: address || undefined,
    siren: siren || raw.slice(0, 9),
  };
}
