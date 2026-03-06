import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { addCreditsForSession, getCreditsFromPack } from '@/lib/stripe-credits';

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  if (!stripeSecret || !webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe ou webhook non configuré.' },
      { status: 501 }
    );
  }
  const sig = request.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Signature manquante' }, { status: 400 });
  }
  let event: Stripe.Event;
  const body = await request.text();
  try {
    const stripe = new Stripe(stripeSecret);
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Signature invalide';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const brandIdRaw = session.client_reference_id ?? session.metadata?.brand_id;
  const pack = session.metadata?.pack;

  if (!brandIdRaw || !pack) {
    return NextResponse.json(
      { error: 'client_reference_id (ID marque) ou metadata.pack manquant' },
      { status: 400 }
    );
  }

  const creditsToAdd = getCreditsFromPack(pack);
  if (creditsToAdd === 0) {
    return NextResponse.json(
      { error: 'Pack non reconnu (attendu 3 ou 10)' },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: 'Supabase admin non configuré (SUPABASE_SERVICE_ROLE_KEY).' },
      { status: 501 }
    );
  }

  const brandId = parseInt(String(brandIdRaw), 10);
  if (Number.isNaN(brandId)) {
    return NextResponse.json({ error: 'brand_id invalide' }, { status: 400 });
  }

  const sessionId = session.id ?? event.id;
  if (!sessionId) {
    return NextResponse.json({ error: 'session_id manquant' }, { status: 400 });
  }

  const { added, error: addError } = await addCreditsForSession(admin, sessionId, brandId, creditsToAdd);
  if (addError) {
    return NextResponse.json({ error: 'Échec mise à jour crédits', details: addError }, { status: 500 });
  }
  return NextResponse.json({ received: true, credits_added: added ? creditsToAdd : 0, already_processed: !added });
}
