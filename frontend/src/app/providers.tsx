'use client';
import { SessionProvider, signOut, useSession } from 'next-auth/react';
import { useEffect } from 'react';

/**
 * TokenErrorHandler detecta RefreshAccessTokenError en la sesión
 * y fuerza un signOut() automático para redirigir al usuario al login.
 *
 * Cuando el refresh token expira o Keycloak revoca la sesión,
 * el usuario es redirigido al login en lugar de quedar con tokens inválidos.
 */
function TokenErrorHandler() {
  const { data: session } = useSession();

  useEffect(() => {
    if ((session as any)?.error === 'RefreshAccessTokenError') {
      // signOut() sin callbackUrl deja que NextAuth use su lógica por defecto,
      // evitando bucles de redirección.
      signOut();
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
