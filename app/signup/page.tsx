'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Package, Store, ArrowRight } from 'lucide-react';

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: 'Faible', color: 'bg-red-500' };
  if (score <= 2) return { score, label: 'Moyen', color: 'bg-orange-400' };
  if (score <= 3) return { score, label: 'Bon', color: 'bg-yellow-400' };
  return { score, label: 'Fort', color: 'bg-green-500' };
}

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get('type') as 'brand' | 'showroom' | null;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const strength = password.length > 0 ? getPasswordStrength(password) : null;

  const redirectTo = type === 'brand' || type === 'showroom' ? `/admin/onboarding?type=${type}` : '/admin';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}${redirectTo}` },
      });
      if (err) {
        setError(err.message);
        return;
      }
      router.push(redirectTo);
    } finally {
      setLoading(false);
    }
  }

  // If no type selected, show role picker
  if (!type) {
    return (
      <div className="min-h-screen bg-[#FBFBFD] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-block text-neutral-900 font-semibold kraftplace-wordmark text-lg mb-8">
            Kraftplace
          </Link>
          <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">Créer un compte</h1>
          <p className="mt-1 text-sm text-neutral-500">Vous êtes…</p>

          <div className="mt-6 grid gap-3">
            <Link
              href="/signup?type=brand"
              className="group flex items-center gap-4 p-5 rounded-2xl border border-black/[0.06] bg-white hover:border-neutral-900/20 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <Package className="h-6 w-6 text-emerald-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-neutral-900 text-[15px]">Une marque</p>
                <p className="text-sm text-neutral-500 mt-0.5">Je veux exposer mes produits dans des boutiques partenaires.</p>
              </div>
              <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-700 group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>

            <Link
              href="/signup?type=showroom"
              className="group flex items-center gap-4 p-5 rounded-2xl border border-black/[0.06] bg-white hover:border-neutral-900/20 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <Store className="h-6 w-6 text-amber-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-neutral-900 text-[15px]">Une boutique</p>
                <p className="text-sm text-neutral-500 mt-0.5">Je veux accueillir des marques artisanales dans mon espace.</p>
              </div>
              <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-700 group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          </div>

          <p className="mt-6 text-center text-sm text-neutral-500">
            Déjà un compte ?{' '}
            <Link href="/login" className="font-bold text-neutral-900 hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFD] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="inline-block text-neutral-900 font-semibold kraftplace-wordmark text-lg mb-8">
          Kraftplace
        </Link>
        <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">Créer un compte</h1>
        <p className="mt-0.5 text-sm font-light text-neutral-500">
          {type === 'brand' ? 'Inscription marque' : 'Inscription boutique'}
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-neutral-600 mb-1">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-black/[0.08] bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
              placeholder="vous@exemple.fr"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs font-medium text-neutral-600 mb-1">Mot de passe (min. 6 caractères)</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2.5 rounded-xl border border-black/[0.08] bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
            />
            {strength && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength.score ? strength.color : 'bg-gray-200'}`} />
                  ))}
                </div>
                <p className={`text-xs mt-1 ${strength.score <= 1 ? 'text-red-600' : strength.score <= 2 ? 'text-orange-500' : 'text-green-600'}`}>
                  {strength.label}
                </p>
              </div>
            )}
          </div>
          {error && <p className="text-sm font-medium text-red-600 bg-red-50 p-2 rounded-xl">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-60 transition-colors duration-150"
          >
            {loading ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>
        <div className="mt-6 flex flex-col items-center gap-2 text-sm">
          <Link href="/signup" className="text-neutral-500 hover:text-neutral-700 hover:underline">
            ← Changer de profil
          </Link>
          <p className="text-neutral-500">
            Déjà un compte ?{' '}
            <Link href="/login" className="font-bold text-neutral-900 hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FBFBFD] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm text-center text-neutral-500">Chargement…</div>
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}
