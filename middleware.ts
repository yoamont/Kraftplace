import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Redirection 301 www → non-www pour tout domaine (ex. www.example.com → https://example.com). */
export function middleware(request: NextRequest) {
  const host = (request.headers.get('host') ?? request.nextUrl.hostname).toLowerCase();
  if (host.startsWith('www.')) {
    const url = request.nextUrl.clone();
    url.host = host.slice(4); // enlève "www."
    url.protocol = 'https:';
    return NextResponse.redirect(url, 301);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match toutes les requêtes sauf _next/static, _next/image, favicon, etc.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg)$).*)',
  ],
};
