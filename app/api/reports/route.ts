import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * POST /api/reports
 * Soumission d'un signalement par un utilisateur connecté (marque ou boutique).
 */
export async function POST(request: NextRequest) {
  let body: { entityType?: string; entityId?: number; reason?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 });
  }

  const entityType = body.entityType === 'brand' || body.entityType === 'showroom' ? body.entityType : null;
  const entityId = typeof body.entityId === 'number' && Number.isInteger(body.entityId) ? body.entityId : null;
  if (!entityType || entityId == null) {
    return NextResponse.json({ error: 'entityType (brand|showroom) et entityId requis.' }, { status: 400 });
  }

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

  const reason = typeof body.reason === 'string' ? body.reason.trim() || null : null;
  const message = typeof body.message === 'string' ? body.message.trim() || null : null;

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    reported_entity_type: entityType,
    reported_entity_id: entityId,
    reason,
    message,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
