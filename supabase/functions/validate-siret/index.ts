// Edge Function Supabase : validation SIRET via API externe
// Déployer avec : supabase functions deploy validate-siret
// Appel : POST /functions/v1/validate-siret avec body { "siret": "12345678901234" }
// Variables secrètes : SIRET_API_URL, SIRET_API_KEY (optionnel)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Luhn : doubler les chiffres aux positions 1, 3, 5… (indices 0, 2, 4, 6, 8, 10, 12)
function siretControlKey(siret: string): boolean {
  const digits = siret.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let n = parseInt(digits[i], 10);
    if (i % 2 === 0) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  let body: { siret?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ valid: false, error: 'Body JSON invalide' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const raw = typeof body.siret === 'string' ? body.siret.trim().replace(/\s/g, '') : '';
  if (raw.length !== 14 || !/^\d{14}$/.test(raw)) {
    return new Response(
      JSON.stringify({ valid: false, error: 'Le SIRET doit comporter exactement 14 chiffres.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  if (!siretControlKey(raw)) {
    return new Response(
      JSON.stringify({ valid: false, error: 'Numéro SIRET invalide (clé de contrôle).' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  const apiUrl = Deno.env.get('SIRET_API_URL');
  if (apiUrl) {
    try {
      const res = await fetch(`${apiUrl.replace(/\/$/, '')}/${raw}`, {
        headers: Deno.env.get('SIRET_API_KEY')
          ? { Authorization: `Bearer ${Deno.env.get('SIRET_API_KEY')}` }
          : {},
      });
      if (!res.ok) {
        return new Response(
          JSON.stringify({ valid: false, error: 'SIRET non reconnu par le registre.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } catch {
      return new Response(
        JSON.stringify({ valid: false, error: 'Service de vérification indisponible.' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
  return new Response(JSON.stringify({ valid: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
