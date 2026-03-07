import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Reconstruye la URL publica real a partir de los headers que Traefik inyecta.
 * req.url dentro del pod contiene el hostname interno del pod
 * (ej: http://crm-frontend-68df588bcd-zgd64:3000/) en lugar de la IP/dominio
 * publico. Traefik propaga la informacion real en x-forwarded-host y
 * x-forwarded-proto, que usamos para armar la URL correcta.
 */
function getPublicUrl(req: NextRequest): URL {
  const forwaredHost = req.headers.get('x-forwarded-host');
  const forwardedProto = req.headers.get('x-forwarded-proto') ?? 'http';

  if (forwaredHost) {
    // Reconstruir con el host publico real que Traefik conoce
    const publicBase = `${forwardedProto}://${forwaredHost}`;
    return new URL(req.nextUrl.pathname + req.nextUrl.search, publicBase);
  }

  // Fallback: sin proxy, usar nextUrl directamente (entorno local)
  return req.nextUrl;
}

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
    // Usar la URL publica real (no el hostname interno del pod)
    const publicUrl = getPublicUrl(req);
    const signinUrl = new URL('/api/auth/signin', publicUrl);
    signinUrl.searchParams.set('callbackUrl', publicUrl.toString());
    return NextResponse.redirect(signinUrl);
  }

  // Propagar traceparent en los headers del request hacia los Route Handlers
  const requestHeaders = new Headers(req.headers);
  if (!requestHeaders.get('traceparent')) {
    const traceId = crypto.randomUUID().replace(/-/g, '');
    const spanId  = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
    requestHeaders.set('traceparent', `00-${traceId}-${spanId}-01`);
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
