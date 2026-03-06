import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { addCreditsForSession, getCreditsFromPack } from '@/lib/stripe-credits';

/**
 * POST /api/credits/confirm
 * Body: { session_id: string }
 * Confirme le paiement Stripe et ajoute les crédits si pas déjà fait (fallback si le webhook n'a pas été reçu).
 * L'utilisateur doit être connecté et être propriétaire de la marque.
 */
export async function POST(request: NextRequest) {
  let body: { session_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 });
  }
  const sessionId = typeof body.session_id === 'string' ? body.session_id.trim() : null;
  if (!sessionId) {
    return NextResponse.json({ error: 'session_id requis.' }, { status: 400 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Supabase URL ou anon key manquante.' }, { status: 501 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  if (!stripeSecret) {
    return NextResponse.json({ error: 'Stripe non configuré.' }, { status: 501 });
  }

  const stripe = new Stripe(stripeSecret);
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, { expand: [] });
  } catch {
    return NextResponse.json({ error: 'Session Stripe introuvable.' }, { status: 404 });
  }

  if (session.payment_status !== 'paid') {
    return NextResponse.json({ error: 'Paiement non finalisé.' }, { status: 400 });
  }

  const brandIdRaw = session.client_reference_id ?? session.metadata?.brand_id;
  const pack = session.metadata?.pack;
  if (!brandIdRaw || !pack) {
    return NextResponse.json({ error: 'Session invalide (marque ou pack manquant).' }, { status: 400 });
  }

  const brandId = parseInt(String(brandIdRaw), 10);
  if (Number.isNaN(brandId)) {
    return NextResponse.json({ error: 'Marque invalide.' }, { status: 400 });
  }

  const { data: brand } = await supabase.from('brands').select('id, owner_id').eq('id', brandId).single();
  if (!brand || (brand as { owner_id?: string }).owner_id !== user.id) {
    return NextResponse.json({ error: 'Marque introuvable ou accès refusé.' }, { status: 403 });
  }

  const creditsToAdd = getCreditsFromPack(pack);
  if (creditsToAdd === 0) {
    return NextResponse.json({ error: 'Pack non reconnu.' }, { status: 400 });
  }

  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY manquante. Ajoute-la dans .env.local (Supabase → Settings → API → service_role), puis redémarre le serveur.' },
      { status: 501 }
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { added, error: addError } = await addCreditsForSession(admin, sessionId, brandId, creditsToAdd);
  if (addError) {
    return NextResponse.json({ error: addError }, { status: 500 });
  }
  return NextResponse.json({ ok: true, credits_added: added ? creditsToAdd : 0, already_processed: !added });
}
