import { AuthOptions } from 'next-auth';
import KeycloakProvider from 'next-auth/providers/keycloak';

/**
 * BUG FIX: Agregado refresh de token.
 * Sin esto, cuando el access_token de Keycloak expira todas las llamadas
 * al backend empiezan a dar 401 silenciosamente y el usuario queda bloqueado
 * sin entender por qué hasta que cierra sesión y vuelve a entrar.
 *
 * MEJORA: Añadida página de signIn explícita para que cuando providers.tsx
 * detecte RefreshAccessTokenError, el signOut() redirija al flujo de login
 * de Keycloak en lugar de a una página 404 o en blanco.
 */
async function refreshAccessToken(token: any) {
  try {
    const url = `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     process.env.KEYCLOAK_ID!,
        client_secret: process.env.KEYCLOAK_SECRET ?? '',
        grant_type:    'refresh_token',
        refresh_token: token.refreshToken,
      }),
    });

    const refreshed = await response.json();
    if (!response.ok) throw refreshed;

    return {
      ...token,
      accessToken:  refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      expiresAt:    Math.floor(Date.now() / 1000) + refreshed.expires_in,
      error: undefined,
    };
  } catch (error) {
    console.error('[auth] Error refreshing token:', error);
    // Marcar el token como expirado para forzar re-login
    return { ...token, error: 'RefreshAccessTokenError' };
  }
}

export const authOptions: AuthOptions = {
  providers: [
    KeycloakProvider({
      clientId:     process.env.KEYCLOAK_ID!,
      clientSecret: process.env.KEYCLOAK_SECRET ?? '',
      issuer:       process.env.KEYCLOAK_ISSUER!,
    }),
  ],

  callbacks: {
    async jwt({ token, account }) {
      // Login inicial: guardar tokens de Keycloak
      if (account) {
        return {
          ...token,
          accessToken:  account.access_token,
          refreshToken: account.refresh_token,
          expiresAt:    account.expires_at,
        };
      }

      // Token vigente: devolverlo tal cual
      if (Date.now() < (token.expiresAt as number) * 1000 - 30_000) {
        return token;
      }

      // Token expirado (o a punto de expirar): refrescar
      return refreshAccessToken(token);
    },

    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      // Propagar error al cliente para que providers.tsx pueda redirigir al login
      if (token.error) {
        (session as any).error = token.error;
      }
      return session;
    },
  },

  session: { strategy: 'jwt' },

  pages: {
    // Ruta explícita de sign-in para que signOut({ callbackUrl }) aterrice correctamente
    signIn: '/api/auth/signin',
  },
};
