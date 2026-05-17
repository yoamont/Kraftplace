'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err) {
        setError(err.message);
        return;
      }
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur réseau. Réessayez.');
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
        <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">Mot de passe oublié</h1>
        <p className="mt-0.5 text-sm font-light text-neutral-500">
          Entrez votre email pour recevoir un lien de réinitialisation.
        </p>

        {sent ? (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <p className="text-sm text-green-800 font-medium">
              Un email de réinitialisation a été envoyé à <strong>{email}</strong>.
            </p>
            <p className="text-xs text-green-600 mt-1">
              Vérifiez votre boîte de réception et vos spams.
            </p>
          </div>
        ) : (
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
            {error && <p className="text-sm font-medium text-red-600 bg-red-50 p-2 rounded-xl">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-60 transition-colors duration-150"
            >
              {loading ? 'Envoi…' : 'Envoyer le lien'}
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
