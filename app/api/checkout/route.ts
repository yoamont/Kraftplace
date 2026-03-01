import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const productPack3 = process.env.STRIPE_PRODUCT_PACK_3 ?? 'prod_U3y3sVL8zFsDqr';
const productPack10 = process.env.STRIPE_PRODUCT_PACK_10 ?? 'prod_U3y4Hg79LWqs4L';

/** Crée une session Stripe Checkout pour un pack de crédits (3 ou 10). */
export async function POST(request: NextRequest) {
  if (!stripeSecret) {
    return NextResponse.json(
      { error: 'Stripe non configuré (STRIPE_SECRET_KEY manquant).' },
      { status: 501 }
    );
  }
  try {
    const body = await request.json();
    const { brand_id, pack } = body as { brand_id: number; pack: 3 | 10 };

    if (!brand_id || (pack !== 3 && pack !== 10)) {
      return NextResponse.json(
        { error: 'Paramètres invalides : brand_id et pack (3 ou 10) requis.' },
        { status: 400 }
      );
    }

    const stripe = new Stripe(stripeSecret);
    const productId = pack === 3 ? productPack3 : productPack10;
    const unitAmount = pack === 3 ? 1500 : 4000; // 15€ et 40€ en centimes

    const origin = request.headers.get('origin') ?? request.nextUrl.origin;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product: productId,
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      client_reference_id: String(brand_id),
      metadata: { pack: String(pack) },
      success_url: `${origin}/credits/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/admin?cancel=1`,
    });

    return NextResponse.json({ url: session.url, session_id: session.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur Stripe';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
