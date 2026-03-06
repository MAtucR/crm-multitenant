import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * BFF Proxy: re-envía todas las llamadas /api/proxy/** al backend Spring Boot.
 *
 * Propaga:
 *   - Authorization: Bearer <JWT de Keycloak>
 *   - traceparent: W3C Trace Context (si viene del cliente)
 *   - tracestate:  W3C Trace Context
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8081';

async function proxy(req: NextRequest, { params }: { params: { path: string[] } }) {
  const session = await getServerSession(authOptions);
  const accessToken = (session as any)?.accessToken;

  // Construir URL del backend
  const backendPath = params.path.join('/');
  const search      = req.nextUrl.search;
  const targetUrl   = `${BACKEND_URL}/api/${backendPath}${search}`;

  // Propagar headers de trazas W3C (Dynatrace los lee nativamente)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // Propagar traceparent / tracestate si vienen en el request original
  const traceparent = req.headers.get('traceparent');
  const tracestate  = req.headers.get('tracestate');
  if (traceparent) headers['traceparent'] = traceparent;
  if (tracestate)  headers['tracestate']  = tracestate;

  const body = req.method !== 'GET' && req.method !== 'HEAD'
    ? await req.text()
    : undefined;

  const response = await fetch(targetUrl, {
    method:  req.method,
    headers,
    body,
  });

  const data = await response.text();

  return new NextResponse(data, {
    status:  response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') ?? 'application/json',
      // Propagar traceparent de vuelta al cliente
      ...(response.headers.get('traceparent')
        ? { 'traceparent': response.headers.get('traceparent')! }
        : {}),
    },
  });
}

export const GET     = proxy;
export const POST    = proxy;
export const PUT     = proxy;
export const PATCH   = proxy;
export const DELETE  = proxy;
