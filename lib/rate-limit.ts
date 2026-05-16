/**
 * Rate limiter in-memory simple pour les API routes.
 * Limite les requetes par IP sur une fenetre glissante.
 * Note: reset au redemarrage du serveur (acceptable pour MVP sur Vercel serverless).
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const stores = new Map<string, Map<string, RateLimitEntry>>();

export interface RateLimitConfig {
  /** Identifiant unique du rate limiter (ex: 'checkout', 'candidatures') */
  id: string;
  /** Nombre max de requetes autorisees dans la fenetre */
  limit: number;
  /** Duree de la fenetre en secondes */
  windowSeconds: number;
}

/**
 * Verifie si une requete est autorisee selon le rate limit.
 * @returns { allowed: true } si OK, ou { allowed: false, retryAfter } si bloque.
 */
export function checkRateLimit(
  config: RateLimitConfig,
  identifier: string
): { allowed: true } | { allowed: false; retryAfter: number } {
  const { id, limit, windowSeconds } = config;

  if (!stores.has(id)) {
    stores.set(id, new Map());
  }
  const store = stores.get(id)!;

  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now > entry.resetAt) {
    // Nouvelle fenetre
    store.set(identifier, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true };
  }

  if (entry.count < limit) {
    entry.count++;
    return { allowed: true };
  }

  // Limite atteinte
  const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
  return { allowed: false, retryAfter };
}

/**
 * Extrait l'IP d'une requete Next.js (headers Vercel/Cloudflare).
 */
export function getRequestIP(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    'unknown'
  );
}
