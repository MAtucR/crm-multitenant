import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * BFF Proxy — reenvía /api/proxy/** al backend Spring Boot.
 *
 * BUG FIX: Cambiado NEXT_PUBLIC_API_URL → API_URL.
 * El prefijo NEXT_PUBLIC_ hace que Next.js embeba el valor en el bundle
 * del cliente, exponiendo la URL interna del backend (http://crm-backend:8081)
 * al browser. API_URL es server-side only y nunca llega al cliente.
 *
 * Propaga:
 *   - Authorization: Bearer <JWT Keycloak>
 *   - traceparent / tracestate W3C
 */
const BACKEND_URL = process.env.API_URL ?? 'http://localhost:8081';

async function proxy(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const session = await getServerSession(authOptions);
  const accessToken = (session as any)?.accessToken;

  const backendPath = params.path.join('/');
  const search      = req.nextUrl.search;
  const targetUrl   = `${BACKEND_URL}/api/${backendPath}${search}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const traceparent = req.headers.get('traceparent');
  const tracestate  = req.headers.get('tracestate');
  if (traceparent) headers['traceparent'] = traceparent;
  if (tracestate)  headers['tracestate']  = tracestate;

  const body =
    req.method !== 'GET' && req.method !== 'HEAD'
      ? await req.text()
      : undefined;

  let response: Response;
  try {
    response = await fetch(targetUrl, { method: req.method, headers, body });
  } catch (err) {
    console.error('[BFF proxy] Error conectando al backend:', err);
    return NextResponse.json(
      { error: 'Backend no disponible' },
      { status: 503 }
    );
  }

  const data = await response.text();

  return new NextResponse(data, {
    status: response.status,
    headers: {
      'Content-Type':
        response.headers.get('Content-Type') ?? 'application/json',
      ...(response.headers.get('traceparent')
        ? { traceparent: response.headers.get('traceparent')! }
        : {}),
    },
  });
}

export const GET    = proxy;
export const POST   = proxy;
export const PUT    = proxy;
export const PATCH  = proxy;
export const DELETE = proxy;
