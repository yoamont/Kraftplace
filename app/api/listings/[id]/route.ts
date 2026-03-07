import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const TITLE_MIN = 1;
const TITLE_MAX = 200;
const STATUSES = ['draft', 'published', 'archived'] as const;

function isValidDate(s: string | null | undefined): boolean {
  if (s == null || s === '') return true;
  const d = new Date(s);
  return !Number.isNaN(d.getTime());
}

/**
 * PATCH /api/listings/[id]
 * Met à jour une annonce après validation côté serveur.
 * Ne modifie que la ligne listing ; les candidatures et conversations restent inchangées (historique préservé).
 * Body: { title?, status?, partnership_start_date?, partnership_end_date?, application_open_date?, application_close_date? }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  const listingId = parseInt(id, 10);
  if (Number.isNaN(listingId)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
  }

  let body: {
    title?: string;
    status?: string;
    partnership_start_date?: string | null;
    partnership_end_date?: string | null;
    application_open_date?: string | null;
    application_close_date?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from('listings')
    .select('id, showroom_id')
    .eq('id', listingId)
    .single();
  if (!existing) {
    return NextResponse.json({ error: 'Annonce introuvable' }, { status: 404 });
  }

  const { data: showroom } = await supabase
    .from('showrooms')
    .select('id')
    .eq('id', (existing as { showroom_id: number }).showroom_id)
    .eq('owner_id', user.id)
    .single();
  if (!showroom) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if (typeof body.title === 'string') {
    const title = body.title.trim();
    if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
      return NextResponse.json(
        { error: `Le titre doit contenir entre ${TITLE_MIN} et ${TITLE_MAX} caractères.` },
        { status: 400 }
      );
    }
    updates.title = title;
  }
  if (body.status && STATUSES.includes(body.status as typeof STATUSES[number])) {
    updates.status = body.status;
  }
  if (body.partnership_start_date !== undefined) {
    if (!isValidDate(body.partnership_start_date)) {
      return NextResponse.json({ error: 'Format de date invalide' }, { status: 400 });
    }
    updates.partnership_start_date = body.partnership_start_date || null;
  }
  if (body.partnership_end_date !== undefined) {
    if (!isValidDate(body.partnership_end_date)) {
      return NextResponse.json({ error: 'Format de date invalide' }, { status: 400 });
    }
    updates.partnership_end_date = body.partnership_end_date || null;
  }
  if (body.application_open_date !== undefined) {
    if (!isValidDate(body.application_open_date)) {
      return NextResponse.json({ error: 'Format de date invalide' }, { status: 400 });
    }
    updates.application_open_date = body.application_open_date || null;
  }
  if (body.application_close_date !== undefined) {
    if (!isValidDate(body.application_close_date)) {
      return NextResponse.json({ error: 'Format de date invalide' }, { status: 400 });
    }
    updates.application_close_date = body.application_close_date || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Aucune modification fournie' }, { status: 400 });
  }

  const { error } = await supabase
    .from('listings')
    .update(updates)
    .eq('id', listingId)
    .eq('showroom_id', (existing as { showroom_id: number }).showroom_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
