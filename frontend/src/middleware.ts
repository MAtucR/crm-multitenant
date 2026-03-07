import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * BUG FIX: Este archivo es el que Next.js ejecuta cuando se usa src/ directory.
 * frontend/middleware.ts en la raiz es ignorado cuando existe src/.
 *
 * No importar NADA de next-auth aqui — incompatible con Edge Runtime.
 * Verificar la cookie de sesion directamente (100% Edge Runtime safe).
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic =
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/login';

  if (isPublic) {
    return NextResponse.next();
  }

  const sessionToken =
    req.cookies.get('next-auth.session-token')?.value ||
    req.cookies.get('__Secure-next-auth.session-token')?.value;

  if (!sessionToken) {
    const signinUrl = new URL('/api/auth/signin', req.url);
    signinUrl.searchParams.set('callbackUrl', req.url);
    return NextResponse.redirect(signinUrl);
  }

  const response = NextResponse.next();

  if (!req.headers.get('traceparent')) {
    const traceId = crypto.randomUUID().replace(/-/g, '');
    const spanId  = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
    response.headers.set('traceparent', `00-${traceId}-${spanId}-01`);
  }

  return response;
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
