import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Vérifie si une candidature acceptée existe déjà pour (brand_id, showroom_id).
 * Source de vérité : messages (CANDIDATURE_SENT puis CANDIDATURE_ACCEPTED dans la conversation).
 */
async function hasAcceptedCandidature(
  supabase: ReturnType<typeof createClient>,
  conversationId: string
): Promise<boolean> {
  const { data: messages } = await supabase
    .from('messages')
    .select('id, type, created_at')
    .eq('conversation_id', conversationId)
    .in('type', ['CANDIDATURE_SENT', 'CANDIDATURE_ACCEPTED'])
    .order('created_at', { ascending: true });

  if (!messages?.length) return false;
  const sentIdx = messages.findIndex((m) => m.type === 'CANDIDATURE_SENT');
  if (sentIdx === -1) return false;
  const acceptedAfter = messages.slice(sentIdx + 1).some((m) => m.type === 'CANDIDATURE_ACCEPTED');
  return acceptedAfter;
}

/**
 * POST /api/candidatures/send
 * Crée une candidature (message CANDIDATURE_SENT + reserved_credits).
 * Bloque si une candidature a déjà été acceptée pour cette marque/boutique.
 * Body: { brandId, showroomId, metadata, motivationMessage?, conversationId? }
 * Header: Authorization: Bearer <access_token> (session Supabase)
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

  let body: {
    brandId: number;
    showroomId: number;
    listingId?: number | null;
    metadata: Record<string, unknown>;
    motivationMessage?: string;
    conversationId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide' }, { status: 400 });
  }

  const { brandId, showroomId, listingId, metadata, motivationMessage = '', conversationId: existingConvId } = body;
  if (typeof brandId !== 'number' || typeof showroomId !== 'number') {
    return NextResponse.json({ error: 'brandId et showroomId requis' }, { status: 400 });
  }

  let conversationId: string | null = existingConvId ?? null;

  if (conversationId) {
    const accepted = await hasAcceptedCandidature(supabase, conversationId);
    if (accepted) {
      return NextResponse.json(
        { error: 'Action impossible : Vous avez déjà un accord avec cette boutique.' },
        { status: 400 }
      );
    }
  } else {
    const listingIdVal = typeof listingId === 'number' ? listingId : null;
    let query = supabase
      .from('conversations')
      .select('id')
      .eq('brand_id', brandId)
      .eq('showroom_id', showroomId);
    if (listingIdVal != null) {
      query = query.eq('listing_id', listingIdVal);
    } else {
      query = query.is('listing_id', null);
    }
    const { data: existing } = await query.maybeSingle();

    if (existing?.id) {
      conversationId = existing.id as string;
      const accepted = await hasAcceptedCandidature(supabase, conversationId);
      if (accepted) {
        return NextResponse.json(
          { error: 'Action impossible : Vous avez déjà un accord avec cette boutique.' },
          { status: 400 }
        );
      }
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from('conversations')
        .insert({
          brand_id: brandId,
          showroom_id: showroomId,
          listing_id: listingIdVal ?? undefined,
        })
        .select('id')
        .single();
      if (insertErr) {
        return NextResponse.json({ error: 'Erreur création conversation' }, { status: 500 });
      }
      conversationId = (inserted?.id as string) ?? null;
    }
  }

  if (!conversationId) {
    return NextResponse.json({ error: 'Conversation introuvable' }, { status: 500 });
  }

  const { data: user } = await supabase.auth.getUser();
  if (!user?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { error: msgErr } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    type: 'CANDIDATURE_SENT',
    sender_id: user.user.id,
    sender_role: 'brand',
    content: motivationMessage?.trim() || null,
    metadata: metadata ?? { status: 'pending' },
    is_read: false,
  });

  if (msgErr) {
    return NextResponse.json({ error: 'Erreur envoi candidature' }, { status: 500 });
  }

  if (typeof motivationMessage === 'string' && motivationMessage.trim()) {
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      type: 'CHAT',
      sender_id: user.user.id,
      sender_role: 'brand',
      content: motivationMessage.trim(),
      is_read: false,
    });
  }

  const { data: row } = await supabase.from('brands').select('reserved_credits').eq('id', brandId).single();
  const reserved = typeof (row as { reserved_credits?: number } | null)?.reserved_credits === 'number'
    ? (row as { reserved_credits: number }).reserved_credits
    : 0;
  await supabase.from('brands').update({ reserved_credits: reserved + 1 }).eq('id', brandId);

  return NextResponse.json({ conversationId });
}
