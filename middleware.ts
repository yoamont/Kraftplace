import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware :
 * 1. Redirection 301 www -> non-www
 * 2. Protection des routes /admin (session Supabase requise)
 */
export function middleware(request: NextRequest) {
  const host = (request.headers.get('host') ?? request.nextUrl.hostname).toLowerCase();

  // www -> non-www redirect
  if (host.startsWith('www.')) {
    const url = request.nextUrl.clone();
    url.host = host.slice(4);
    url.protocol = 'https:';
    return NextResponse.redirect(url, 301);
  }

  // Protection /admin : verifier la presence d'un token de session Supabase
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith('/admin')) {
    const hasSession = request.cookies.getAll().some(
      (c) => c.name.includes('-auth-token') && c.value.length > 10
    );
    if (!hasSession) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg)$).*)',
  ],
};
