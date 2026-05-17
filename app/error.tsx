'use client';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#FBFBFD] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <p className="text-5xl font-bold text-neutral-200">Oups</p>
        <h1 className="mt-4 text-xl font-semibold text-neutral-900 tracking-tight">
          Une erreur est survenue
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Quelque chose ne s&apos;est pas passé comme prévu. Réessayez ou revenez plus tard.
        </p>
        <div className="mt-8 flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors"
          >
            Réessayer
          </button>
          <a
            href="/"
            className="px-5 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 text-sm font-medium hover:bg-neutral-50 transition-colors"
          >
            Retour à l&apos;accueil
          </a>
        </div>
      </div>
    </div>
  );
}
