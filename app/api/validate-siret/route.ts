import { NextRequest, NextResponse } from 'next/server';
import { validateSiret } from '@/services/siretService';

/**
 * POST /api/validate-siret
 * Body: { siret: string }
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
