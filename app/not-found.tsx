import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FBFBFD] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <p className="text-6xl font-bold text-neutral-200">404</p>
        <h1 className="mt-4 text-xl font-semibold text-neutral-900 tracking-tight">
          Page introuvable
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          La page que vous recherchez n&apos;existe pas ou a été déplacée.
        </p>
        <div className="mt-8 flex gap-3 justify-center">
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors"
          >
            Retour à l&apos;accueil
          </Link>
          <Link
            href="/marques"
            className="px-5 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 text-sm font-medium hover:bg-neutral-50 transition-colors"
          >
            Voir les marques
          </Link>
        </div>
      </div>
    </div>
  );
}
