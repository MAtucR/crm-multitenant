import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * BUG FIX: withAuth de next-auth causa "Cannot redefine property: __import_unsupported"
 * en Edge Runtime porque internamente importa modulos Node.js incompatibles.
 * Solucion: usar getToken() directamente, que si es Edge Runtime compatible.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rutas publicas: no requieren autenticacion
  const isPublic =
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname === '/login';

  if (isPublic) {
    return NextResponse.next();
  }

  // Verificar token JWT de NextAuth (Edge Runtime compatible)
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL('/api/auth/signin', req.url);
    loginUrl.searchParams.set('callbackUrl', req.url);
    return NextResponse.redirect(loginUrl);
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
