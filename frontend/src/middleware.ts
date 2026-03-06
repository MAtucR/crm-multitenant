import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

/**
 * Middleware de Next.js:
 * 1. Protege todas las rutas excepto /api/auth/**.
 * 2. Inyecta un header 'traceparent' W3C si no viene uno del cliente.
 *    Formato: 00-<traceId 32hex>-<spanId 16hex>-01
 */
export default withAuth(
  function middleware(req: NextRequest) {
    const response = NextResponse.next();

    // Generar traceparent si no existe (primer hop)
    if (!req.headers.get('traceparent')) {
      const traceId = uuidv4().replace(/-/g, '');
      const spanId  = uuidv4().replace(/-/g, '').substring(0, 16);
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
