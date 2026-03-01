import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

/**
 * Client Supabase côté serveur avec la clé service role.
 * Bypass RLS - à utiliser uniquement dans les API routes (ex: liste marques/boutiques pour la messagerie).
 * Si SUPABASE_SERVICE_ROLE_KEY n'est pas définie, retourne null.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey);
}
