import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const stripeSecret = process.env.STRIPE_SECRET_KEY;
const productPack3 = process.env.STRIPE_PRODUCT_PACK_3 ?? 'prod_U3y3sVL8zFsDqr';
const productPack10 = process.env.STRIPE_PRODUCT_PACK_10 ?? 'prod_U3y4Hg79LWqs4L';

/** Cree une session Stripe Checkout pour un pack de credits (3 ou 10). */
export async function POST(request: NextRequest) {
  if (!stripeSecret) {
    return NextResponse.json(
      { error: 'Stripe non configure (STRIPE_SECRET_KEY manquant).' },
      { status: 501 }
    );
  }

  /* FIX SECURITE : authentification obligatoire */
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) {
    return NextResponse.json({ error: 'Non autorise' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { brand_id, pack } = body as { brand_id: number; pack: 3 | 10 };

    if (!brand_id || (pack !== 3 && pack !== 10)) {
      return NextResponse.json(
        { error: 'Parametres invalides : brand_id et pack (3 ou 10) requis.' },
        { status: 400 }
      );
    }

    /* FIX SECURITE : verifier que brand_id appartient au user */
    const { data: brand } = await supabase
      .from('brands')
      .select('id')
      .eq('id', brand_id)
      .eq('owner_id', userData.user.id)
      .single();

    if (!brand) {
      return NextResponse.json({ error: 'Marque non trouvee ou acces refuse' }, { status: 403 });
    }

    const stripe = new Stripe(stripeSecret);
    const productId = pack === 3 ? productPack3 : productPack10;
    const unitAmount = pack === 3 ? 1500 : 4000;

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
