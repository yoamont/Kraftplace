import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateSiret } from '@/services/siretService';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Email autorisé pour le SIRET de test 00000000000000 */
const TEST_SIRET_ALLOWED_EMAIL = 'yoann.montagnon@gmail.com';

/**
 * POST /api/validate-siret
 * Body: { siret: string }
 * Header: Authorization: Bearer <token> (optionnel, requis pour accepter le SIRET de test)
 * Vérifie le SIRET via l'API recherche-entreprises.api.gouv.fr.
 * Retourne { valid, error?, companyName?, address?, siren? } pour préremplir le profil.
 */
export async function POST(request: NextRequest) {
  let body: { siret?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ valid: false, error: 'Body JSON invalide' }, { status: 400 });
  }

  const raw = typeof body.siret === 'string' ? body.siret.trim().replace(/\s/g, '') : '';
  if (!raw) {
    return NextResponse.json({ valid: false, error: 'SIRET requis.' }, { status: 400 });
  }

  // SIRET de test : accepté uniquement pour yoann.montagnon@gmail.com
  if (raw === '00000000000000') {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    if (token) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email?.toLowerCase() === TEST_SIRET_ALLOWED_EMAIL.toLowerCase()) {
        return NextResponse.json({
          valid: true,
          companyName: 'Entreprise de test',
          address: undefined,
          siren: '000000000',
        });
      }
    }
    return NextResponse.json({ valid: false, error: 'Numéro SIRET invalide (clé de contrôle).' }, { status: 400 });
  }

  const result = await validateSiret(raw);
  if (result.valid) {
    return NextResponse.json({
      valid: true,
      companyName: result.companyName,
      address: result.address,
      siren: result.siren,
    });
  }
  return NextResponse.json(
    { valid: false, error: result.error ?? 'SIRET invalide.' },
    { status: 400 }
  );
}
