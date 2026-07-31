import type { NextAuthConfig } from 'next-auth';

/**
 * Configuración compartida y *edge-safe*: no importa la base de datos ni
 * Argon2, para que el middleware pueda usarla. La verificación de credenciales
 * vive en server/auth.ts (runtime Node).
 */
export const authConfig = {
  session: {
    strategy: 'jwt',
    // Una jornada de capacitación.
    maxAge: 60 * 60 * 12,
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.organizationId = user.organizationId;
        token.trainingSessionId = user.trainingSessionId;
        token.mustChangePassword = user.mustChangePassword;
        token.fullName = user.fullName;
        token.username = user.username;
      }

      // Tras cambiar la contraseña se refresca el token sin volver a iniciar sesión.
      if (trigger === 'update' && session && typeof session === 'object') {
        const patch = session as { mustChangePassword?: boolean };
        if (typeof patch.mustChangePassword === 'boolean') {
          token.mustChangePassword = patch.mustChangePassword;
        }
      }

      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub ?? '';
      session.user.role = token.role;
      session.user.organizationId = token.organizationId;
      session.user.trainingSessionId = token.trainingSessionId;
      session.user.mustChangePassword = token.mustChangePassword;
      session.user.fullName = token.fullName;
      session.user.username = token.username;
      return session;
    },
  },
} satisfies NextAuthConfig;
