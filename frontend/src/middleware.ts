import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware de Next.js:
 * 1. Protege todas las rutas excepto /api/auth/**.
 * 2. Inyecta un header 'traceparent' W3C si no viene del cliente.
 *    Formato: 00-<traceId 32hex>-<spanId 16hex>-01
 *
 * BUG FIX: Se eliminó la dependencia 'uuid' que no estaba en package.json.
 * Se usa crypto.randomUUID() que es nativo en Node 14.17+ y Edge Runtime de Next.js.
 */
export default withAuth(
  function middleware(req: NextRequest) {
    const response = NextResponse.next();

    if (!req.headers.get('traceparent')) {
      // crypto.randomUUID() está disponible en el Edge Runtime de Next.js sin imports
      const traceId = crypto.randomUUID().replace(/-/g, '');
      const spanId  = crypto.randomUUID().replace(/-/g, '').substring(0, 16);
      response.headers.set('traceparent', `00-${traceId}-${spanId}-01`);
    }

    return response;
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
