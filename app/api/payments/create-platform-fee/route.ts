import { NextRequest, NextResponse } from 'next/server';

/**
 * Crée un PaymentIntent Stripe pour la commission plateforme (2 %).
 * À appeler côté boutique (demande paiement ventes) ou côté marque (demande paiement loyer)
 * avant d'insérer la ligne dans payment_requests.
 *
 * Prérequis : STRIPE_SECRET_KEY et STRIPE_PUBLISHABLE_KEY dans .env.local
 * Pour l'instant, retourne une erreur si Stripe n'est pas configuré.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json(
      { error: 'Stripe non configuré. Ajoutez STRIPE_SECRET_KEY dans .env.local pour activer les paiements.' },
      { status: 501 }
    );
  }
  try {
    const body = await request.json();
    const { amount_cents, currency = 'eur', payment_request_id } = body as {
      amount_cents: number;
      currency?: string;
      payment_request_id?: string;
    };
    if (typeof amount_cents !== 'number' || amount_cents <= 0) {
      return NextResponse.json({ error: 'amount_cents invalide' }, { status: 400 });
    }
    // TODO: const stripe = require('stripe')(secret);
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount: amount_cents,
    //   currency,
    //   metadata: { payment_request_id: payment_request_id ?? '' },
    // });
    // return NextResponse.json({ client_secret: paymentIntent.client_secret, id: paymentIntent.id });
    return NextResponse.json(
      { error: 'Intégration Stripe à finaliser (création PaymentIntent pour la commission 2 %).' },
      { status: 501 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
