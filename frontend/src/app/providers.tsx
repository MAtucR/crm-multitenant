'use client';
import { SessionProvider, signOut, useSession } from 'next-auth/react';
import { useEffect } from 'react';

/**
 * MEJORA: TokenErrorHandler detecta RefreshAccessTokenError en la sesión
 * y fuerza un signOut() automático para redirigir al usuario al login.
 *
 * Sin esto, cuando el refresh token expira o Keycloak revoca la sesión,
 * el usuario queda en un estado roto: la UI carga pero todas las llamadas
 * al backend devuelven 401 de forma silenciosa, sin ningún feedback visual.
 * Con este handler, el usuario es redirigido al login automáticamente.
 */
function TokenErrorHandler() {
  const { data: session } = useSession();

  useEffect(() => {
    if ((session as any)?.error === 'RefreshAccessTokenError') {
      // Cerrar sesión local y redirigir al proveedor de identidad (Keycloak)
      signOut({ callbackUrl: '/api/auth/signin' });
    }
  }, [session]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TokenErrorHandler />
      {children}
    </SessionProvider>
  );
}
