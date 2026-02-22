'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (err) {
        setError(err.message);
        return;
      }
      router.push('/admin');
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
        <h1 className="text-2xl font-bold text-kraft-black">Connexion</h1>
        <p className="mt-1 text-sm text-kraft-700">Accédez à votre tableau de bord</p>
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
            <label htmlFor="password" className="block text-sm font-semibold text-kraft-800 mb-1">Mot de passe</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border-2 border-kraft-300 bg-kraft-50 text-kraft-black placeholder:text-kraft-500 focus:outline-none focus:ring-2 focus:ring-kraft-black focus:border-kraft-black"
            />
          </div>
          {error && <p className="text-sm font-medium text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-lg bg-kraft-black text-kraft-off-white font-bold text-base hover:bg-kraft-900 disabled:opacity-60 border-2 border-kraft-black transition-colors"
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-kraft-700">
          Pas de compte ?{' '}
          <Link href="/signup" className="font-bold text-kraft-black hover:underline">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}
