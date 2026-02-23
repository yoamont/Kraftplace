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
    <div className="min-h-screen bg-kraft-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="inline-block text-kraft-black font-semibold kraftplace-wordmark text-lg mb-8">
          Kraftplace
        </Link>
        <h1 className="text-2xl font-bold text-kraft-black">Créer un compte</h1>
        <p className="mt-1 text-sm text-kraft-700">
          {type === 'brand' ? 'Inscription en tant que marque' : type === 'showroom' ? 'Inscription en tant que boutique' : 'Rejoignez Kraftplace'}
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-kraft-800 mb-1">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border-2 border-kraft-300 bg-kraft-50 text-kraft-black placeholder:text-kraft-500 focus:outline-none focus:ring-2 focus:ring-kraft-black focus:border-kraft-black"
              placeholder="vous@exemple.fr"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-kraft-800 mb-1">Mot de passe (min. 6 caractères)</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-lg border-2 border-kraft-300 bg-kraft-50 text-kraft-black placeholder:text-kraft-500 focus:outline-none focus:ring-2 focus:ring-kraft-black focus:border-kraft-black"
            />
          </div>
          {error && <p className="text-sm font-medium text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-lg bg-kraft-black text-kraft-off-white font-bold text-base hover:bg-kraft-900 disabled:opacity-60 border-2 border-kraft-black transition-colors"
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
