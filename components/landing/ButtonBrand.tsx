'use client';

import Link from 'next/link';

const baseClass =
  'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-bold bg-white text-kraft-black border border-kraft-900 shadow-sm hover:bg-kraft-50 hover:border-kraft-black transition-colors';

type Props = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

export function ButtonBrand({ href, children, className = '' }: Props) {
  return (
    <Link href={href} className={`${baseClass} ${className}`.trim()}>
      {children}
    </Link>
  );
}
