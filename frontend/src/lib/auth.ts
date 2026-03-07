import { AuthOptions } from 'next-auth';
import KeycloakProvider from 'next-auth/providers/keycloak';

/**
 * BUG FIX: Agregado refresh de token.
 * Sin esto, cuando el access_token de Keycloak expira todas las llamadas
 * al backend empiezan a dar 401 silenciosamente y el usuario queda bloqueado
 * sin entender por qué hasta que cierra sesión y vuelve a entrar.
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
      if (account) {
        return {
          ...token,
          accessToken:  account.access_token,
          refreshToken: account.refresh_token,
          expiresAt:    account.expires_at,
        };
      }

      if (Date.now() < (token.expiresAt as number) * 1000 - 30_000) {
        return token;
      }

      return refreshAccessToken(token);
    },

    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      if (token.error) {
        (session as any).error = token.error;
      }
      return session;
    },
  },

  session: { strategy: 'jwt' },

  // IMPORTANTE: NO definir pages.signIn.
  // '/api/auth/signin' es la ruta interna del handler de NextAuth, no una
  // página custom. Si se la asigna aquí, NextAuth entra en bucle y devuelve
  // 401 en cada request no autenticado (el error visible en producción).
  // Sin esta clave, NextAuth usa su página built-in que redirige a Keycloak.
};
