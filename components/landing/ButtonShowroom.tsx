'use client';

import Link from 'next/link';

const baseClass =
  'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-bold bg-kraft-black text-kraft-off-white hover:bg-kraft-900 transition-colors';

type Props = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

export function ButtonShowroom({ href, children, className = '' }: Props) {
  return (
    <Link href={href} className={`${baseClass} ${className}`.trim()}>
      {children}
    </Link>
  );
}
