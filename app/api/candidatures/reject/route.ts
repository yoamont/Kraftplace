import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase-server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * POST /api/candidatures/reject
 * Décremente reserved_credits de la marque (côté serveur, service_role).
 * Le client doit être le propriétaire de la boutique pour refuser.
 * Body: { conversationId, messageId? }
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  let body: { conversationId?: string; messageId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 });
  }
  const { conversationId } = body;
  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId requis' }, { status: 400 });
  }

  const { data: conv, error: convErr } = await supabase
    .from('conversations')
    .select('id, showroom_id, brand_id')
    .eq('id', conversationId)
    .single();
  if (convErr || !conv) {
    return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 });
  }

  const { data: showroom } = await supabase
    .from('showrooms')
    .select('id')
    .eq('id', (conv as { showroom_id: number }).showroom_id)
    .eq('owner_id', user.id)
    .single();
  if (!showroom) {
    return NextResponse.json({ error: 'Non autorisé : vous devez être le propriétaire de la boutique' }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 501 });
  }

  const brandId = (conv as { brand_id: number }).brand_id;
  const { data: row, error: fetchErr } = await admin
    .from('brands')
    .select('reserved_credits')
    .eq('id', brandId)
    .single();
  if (fetchErr || !row) {
    return NextResponse.json({ error: 'Marque introuvable' }, { status: 404 });
  }

  const r = typeof (row as { reserved_credits?: number }).reserved_credits === 'number' ? (row as { reserved_credits: number }).reserved_credits : 0;
  const { error: updateErr } = await admin
    .from('brands')
    .update({ reserved_credits: Math.max(0, r - 1) })
    .eq('id', brandId);
  if (updateErr) {
    return NextResponse.json({ error: 'Échec mise à jour crédits', details: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
