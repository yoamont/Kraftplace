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
 * POST /api/listings
 * Crée une annonce après validation côté serveur.
 * Body: { title, status?, partnership_start_date?, partnership_end_date?, application_open_date?, application_close_date? }
 * L'utilisateur doit être propriétaire du showroom (showroom_id envoyé ou déduit côté client : on vérifie via RLS en n'acceptant que showroom_id).
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

  let body: {
    showroom_id?: number;
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

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
    return NextResponse.json(
      { error: `Le titre doit contenir entre ${TITLE_MIN} et ${TITLE_MAX} caractères.` },
      { status: 400 }
    );
  }

  const status = body.status && STATUSES.includes(body.status as typeof STATUSES[number]) ? body.status : 'draft';
  const showroomId = typeof body.showroom_id === 'number' ? body.showroom_id : null;
  if (showroomId == null) {
    return NextResponse.json({ error: 'showroom_id requis' }, { status: 400 });
  }

  const partnershipStart = body.partnership_start_date ?? null;
  const partnershipEnd = body.partnership_end_date ?? null;
  const applicationOpen = body.application_open_date ?? null;
  const applicationClose = body.application_close_date ?? null;

  if (![partnershipStart, partnershipEnd, applicationOpen, applicationClose].every(isValidDate)) {
    return NextResponse.json({ error: 'Format de date invalide' }, { status: 400 });
  }

  const { data: showroom } = await supabase
    .from('showrooms')
    .select('id')
    .eq('id', showroomId)
    .eq('owner_id', user.id)
    .single();
  if (!showroom) {
    return NextResponse.json({ error: 'Showroom non trouvé ou non autorisé' }, { status: 403 });
  }

  const { data: row, error } = await supabase
    .from('listings')
    .insert({
      showroom_id: showroomId,
      title,
      status,
      partnership_start_date: partnershipStart || null,
      partnership_end_date: partnershipEnd || null,
      application_open_date: applicationOpen || null,
      application_close_date: applicationClose || null,
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: (row as { id: number }).id });
}
