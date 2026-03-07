import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * BUG FIX: next-auth (incluyendo getToken de next-auth/jwt) importa modulos
 * Node.js que no son compatibles con Edge Runtime, causando:
 * "Cannot redefine property: __import_unsupported"
 *
 * Solucion: no importar NADA de next-auth en middleware.
 * Verificar la cookie de sesion directamente — 100% Edge Runtime compatible.
 * La validacion real del JWT ocurre en cada API route via getServerSession.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rutas publicas: no requieren autenticacion
  const isPublic =
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/login';

  if (isPublic) {
    return NextResponse.next();
  }

  // Verificar presencia de cookie de sesion NextAuth (Edge Runtime safe)
  // next-auth usa 'next-auth.session-token' en HTTP o '__Secure-next-auth.session-token' en HTTPS
  const sessionToken =
    req.cookies.get('next-auth.session-token')?.value ||
    req.cookies.get('__Secure-next-auth.session-token')?.value;

  if (!sessionToken) {
    const signinUrl = new URL('/api/auth/signin', req.url);
    signinUrl.searchParams.set('callbackUrl', req.url);
    return NextResponse.redirect(signinUrl);
  }

  const response = NextResponse.next();

  // Inyectar W3C traceparent para trazabilidad distribuida
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
