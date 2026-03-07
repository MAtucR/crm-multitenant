import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * BUG FIX: Este archivo es el que Next.js ejecuta cuando se usa src/ directory.
 * frontend/middleware.ts en la raiz es ignorado cuando existe src/.
 *
 * No importar NADA de next-auth aqui — incompatible con Edge Runtime.
 * Verificar la cookie de sesion directamente (100% Edge Runtime safe).
 *
 * BUG FIX: Traceparent fijado en request headers, no en response headers.
 * El BFF proxy en /api/proxy/[...path]/route.ts lee el header traceparent de
 * la REQUEST entrante (req.headers.get('traceparent')). Si lo seteamos en la
 * RESPONSE (como estaba antes), el proxy nunca lo ve y el backend nunca recibe
 * el header → el tracing distribuido end-to-end estaba completamente roto.
 * Solución: NextResponse.next({ request: { headers } }) para propagar el
 * header generado al request que verán los Route Handlers posteriores.
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

  // Copiar headers del request entrante y añadir traceparent si no viene ya
  const requestHeaders = new Headers(req.headers);
  if (!requestHeaders.get('traceparent')) {
    const traceId = crypto.randomUUID().replace(/-/g, '');
    const spanId  = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
    requestHeaders.set('traceparent', `00-${traceId}-${spanId}-01`);
  }

  // Pasar los headers modificados al request para que los Route Handlers los lean
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
