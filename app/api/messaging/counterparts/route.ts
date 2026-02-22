import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

type ShowroomOption = { id: number; name: string | null; avatar_url: string | null; owner_id: string };
type BrandOption = { id: number; brand_name: string | null; avatar_url: string | null; owner_id: string };

/**
 * GET ?mode=brand|showroom
 * Retourne la liste des boutiques (publiées) ou des marques pour le modal "Nouvelle conversation".
 * Utilise la clé service role pour contourner la RLS.
 */
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('mode');
  if (mode !== 'brand' && mode !== 'showroom') {
    return NextResponse.json({ error: 'Paramètre mode requis: brand ou showroom' }, { status: 400 });
  }

  const client = getSupabaseAdmin();
  if (!client) {
    return NextResponse.json(
      {
        error:
          'Service role non configurée. Ajoutez SUPABASE_SERVICE_ROLE_KEY dans .env.local (Supabase → Settings → API → service_role), ou exécutez supabase-messaging-list-brands-showrooms.sql.',
      },
      { status: 503 }
    );
  }

  if (mode === 'showroom') {
    const { data, error } = await client
      .from('showrooms')
      .select('id, name, avatar_url, owner_id')
      .eq('publication_status', 'published')
      .order('name');
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ options: (data as ShowroomOption[]) ?? [] });
  }

  const { data, error } = await client
    .from('brands')
    .select('id, brand_name, avatar_url, owner_id')
    .order('brand_name');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ options: (data as BrandOption[]) ?? [] });
}
