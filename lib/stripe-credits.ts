import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Ajoute les crédits pour une session Stripe de manière idempotente.
 * Si la session_id a déjà été traitée (table stripe_credit_sessions), ne fait rien.
 * Sinon insère la session et met à jour brands.credits.
 */
export async function addCreditsForSession(
  admin: SupabaseClient,
  sessionId: string,
  brandId: number,
  creditsToAdd: number
): Promise<{ added: boolean; error?: string }> {
  const { error: insertError } = await admin.from('stripe_credit_sessions').insert({
    session_id: sessionId,
    brand_id: brandId,
    credits_added: creditsToAdd,
  });
  if (insertError) {
    if (insertError.code === '23505') {
      return { added: false };
    }
    return { added: false, error: insertError.message };
  }
  const { data: brand, error: fetchError } = await admin.from('brands').select('credits').eq('id', brandId).single();
  if (fetchError || !brand) return { added: false, error: 'Marque introuvable' };
  const current = typeof brand.credits === 'number' ? brand.credits : 0;
  const { error: updateError } = await admin.from('brands').update({ credits: current + creditsToAdd }).eq('id', brandId);
  if (updateError) return { added: false, error: updateError.message };
  return { added: true };
}

export function getCreditsFromPack(pack: string | null | undefined): number {
  if (pack === '10') return 10;
  if (pack === '3') return 3;
  return 0;
}
