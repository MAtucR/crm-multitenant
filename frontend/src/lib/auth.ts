import { AuthOptions } from 'next-auth';
import KeycloakProvider from 'next-auth/providers/keycloak';

/**
 * Configuración de NextAuth con proveedor Keycloak.
 * Persiste el access_token (JWT de Keycloak) en la sesión
 * para que el BFF lo propague al backend.
 */
export const authOptions: AuthOptions = {
  providers: [
    KeycloakProvider({
      clientId:     process.env.KEYCLOAK_ID!,
      clientSecret: process.env.KEYCLOAK_SECRET ?? '',
      issuer:       process.env.KEYCLOAK_ISSUER!,
    }),
  ],

  callbacks: {
    // Guardar el access_token (JWT de Keycloak) en el token de NextAuth
    async jwt({ token, account }) {
      if (account) {
        token.accessToken  = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt    = account.expires_at;
      }
      return token;
    },

    // Exponerlo en la sesión del cliente
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      return session;
    },
  },

  session: { strategy: 'jwt' },
};
