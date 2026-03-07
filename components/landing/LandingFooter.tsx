import Link from 'next/link';

export function LandingFooter() {
  return (
    <footer className="px-4 py-6 border-t border-kraft-300 bg-kraft-100 text-center text-sm text-kraft-700">
      Kraftplace · Mise en relation marques & boutiques
      <span className="block mt-2">
        <Link href="/mentions-legales" className="text-kraft-600 hover:text-kraft-800 underline-offset-2 hover:underline">
          Mentions légales
        </Link>
      </span>
    </footer>
  );
}
