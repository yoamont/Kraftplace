'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get('type') as 'brand' | 'showroom' | null;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-[#FBFBFD] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="inline-block text-neutral-900 font-semibold kraftplace-wordmark text-lg mb-8">
          Kraftplace
        </Link>
        <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">Créer un compte</h1>
        <p className="mt-0.5 text-sm font-light text-neutral-500">
          {type === 'brand' ? 'Marque' : type === 'showroom' ? 'Boutique' : 'Rejoignez Kraftplace'}
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
        <p className="mt-6 text-center text-sm text-kraft-700">
          Déjà un compte ?{' '}
          <Link href="/login" className="font-bold text-kraft-black hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
