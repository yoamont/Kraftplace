import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * GET /api/listings/public/[id]
 * Retourne une annonce publiée avec showroom et options de rémunération (accès public, pas d'auth).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const listingId = parseInt(id, 10);
  if (Number.isNaN(listingId)) {
    return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data: listing, error: listingErr } = await supabase
    .from('listings')
    .select('id, showroom_id, title, status, partnership_start_date, partnership_end_date, application_open_date, application_close_date')
    .eq('id', listingId)
    .single();

  if (listingErr || !listing) {
    return NextResponse.json({ error: 'Annonce introuvable' }, { status: 404 });
  }

  const row = listing as { status: string; showroom_id: number };
  if (row.status !== 'published') {
    return NextResponse.json({ error: 'Annonce introuvable' }, { status: 404 });
  }

  const [showroomRes, optionsRes] = await Promise.all([
    supabase
      .from('showrooms')
      .select('id, name, city, description, avatar_url, image_url, instagram_handle, shop_type, start_date, end_date')
      .eq('id', row.showroom_id)
      .single(),
    supabase
      .from('showroom_commission_options')
      .select('id, sort_order, rent, rent_period, commission_percent, description')
      .eq('showroom_id', row.showroom_id)
      .order('sort_order'),
  ]);

  const showroom = showroomRes.data;
  const options = (optionsRes.data ?? []).filter(
    (o: { rent: number | null; commission_percent: number | null; description: string | null }) =>
      (o.rent != null && o.rent > 0) || (o.commission_percent != null && o.commission_percent > 0) || (o.description?.trim() ?? '')
  );

  if (!showroom) {
    return NextResponse.json({ error: 'Boutique introuvable' }, { status: 404 });
  }

  return NextResponse.json({
    listing: {
      id: listing.id,
      showroom_id: row.showroom_id,
      title: (listing as { title: string }).title,
      partnership_start_date: (listing as { partnership_start_date: string | null }).partnership_start_date,
      partnership_end_date: (listing as { partnership_end_date: string | null }).partnership_end_date,
      application_open_date: (listing as { application_open_date: string | null }).application_open_date,
      application_close_date: (listing as { application_close_date: string | null }).application_close_date,
    },
    showroom: {
      id: (showroom as { id: number }).id,
      name: (showroom as { name: string }).name,
      city: (showroom as { city: string | null }).city,
      description: (showroom as { description: string | null }).description,
      avatar_url: (showroom as { avatar_url: string | null }).avatar_url,
      image_url: (showroom as { image_url: string | null }).image_url,
      instagram_handle: (showroom as { instagram_handle: string | null }).instagram_handle,
      shop_type: (showroom as { shop_type: string | null }).shop_type,
      start_date: (showroom as { start_date: string | null }).start_date,
      end_date: (showroom as { end_date: string | null }).end_date,
    },
    commissionOptions: options,
  });
}
