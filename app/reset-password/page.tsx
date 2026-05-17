'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

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

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const strength = password.length > 0 ? getPasswordStrength(password) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(err.message);
        return;
      }
      setDone(true);
      setTimeout(() => router.push('/admin'), 2000);
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
        <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">Nouveau mot de passe</h1>
        <p className="mt-0.5 text-sm font-light text-neutral-500">
          Choisissez un nouveau mot de passe sécurisé.
        </p>

        {done ? (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <p className="text-sm text-green-800 font-medium">
              Mot de passe mis à jour avec succès. Redirection…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-neutral-600 mb-1">
                Nouveau mot de passe (min. 6 caractères)
              </label>
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
            <div>
              <label htmlFor="confirm" className="block text-xs font-medium text-neutral-600 mb-1">
                Confirmer le mot de passe
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
              {loading ? 'Mise à jour…' : 'Changer mon mot de passe'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-kraft-700">
          <Link href="/login" className="font-bold text-kraft-black hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
