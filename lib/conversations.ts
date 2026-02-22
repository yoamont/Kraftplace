import { supabase } from '@/lib/supabase';

/**
 * Récupère l'id de la conversation pour un couple (brand_id, showroom_id).
 * Crée la conversation si elle n'existe pas.
 * Table unique : conversations (id, brand_id, showroom_id).
 */
export async function getOrCreateConversationId(
  brandId: number,
  showroomId: number
): Promise<string | null> {
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('brand_id', brandId)
    .eq('showroom_id', showroomId)
    .maybeSingle();

  if (existing?.id) return existing.id as string;

  const { data: inserted, error } = await supabase
    .from('conversations')
    .insert({ brand_id: brandId, showroom_id: showroomId })
    .select('id')
    .single();

  if (error) return null;
  return (inserted?.id as string) ?? null;
}
