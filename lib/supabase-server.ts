import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Client Supabase côté serveur avec la clé service role.
 * Bypass RLS - à utiliser uniquement dans les API routes (ex: crédits, candidatures, webhooks).
 * Si SUPABASE_SERVICE_ROLE_KEY n'est pas définie dans .env.local, retourne null.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!serviceRoleKey || !supabaseUrl) return null;
  return createClient(supabaseUrl, serviceRoleKey);
}
