import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * BUG FIX: El middleware debe estar en frontend/middleware.ts (al mismo nivel
 * que src/), NO dentro de frontend/src/middleware.ts.
 * Next.js 14 con App Router busca el middleware en la raíz del proyecto
 * (o al nivel de src/ si se usa src dir). Si está dentro de src/app nunca se ejecuta.
 *
 * Este middleware:
 * 1. Protege todas las rutas autenticadas via NextAuth
 * 2. Inyecta W3C traceparent para trazabilidad distribuida con Dynatrace
 */
export default withAuth(
  function middleware(req: NextRequest) {
    const response = NextResponse.next();

    // Inyectar traceparent W3C si no viene ya en el request
    if (!req.headers.get('traceparent')) {
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
  // Proteger todo excepto rutas públicas de NextAuth, assets estáticos e imágenes
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
