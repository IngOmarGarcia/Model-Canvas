import { and, eq } from 'drizzle-orm';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import { db } from '@/db';
import { profiles, trainingParticipants, trainingSessions } from '@/db/schema';
import { loginSchema } from '@/lib/validation/auth';
import { verifyPassword } from '@/lib/password';

import { authConfig } from './auth.config';
import {
  clearLoginAttempts,
  clientIpFrom,
  isLoginBlocked,
  recordFailedLogin,
} from './services/login-attempts.service';

/**
 * Resuelve la capacitación a la que pertenece el usuario:
 *  - participante: la sesión en la que está inscrito
 *  - facilitador: la capacitación más reciente que administra
 */
async function resolveTrainingSessionId(
  profileId: string,
  role: 'facilitator' | 'participant',
): Promise<string | null> {
  if (role === 'participant') {
    const [row] = await db
      .select({ id: trainingParticipants.trainingSessionId })
      .from(trainingParticipants)
      .where(
        and(
          eq(trainingParticipants.profileId, profileId),
          eq(trainingParticipants.status, 'active'),
        ),
      )
      .limit(1);
    return row?.id ?? null;
  }

  const [row] = await db
    .select({ id: trainingSessions.id })
    .from(trainingSessions)
    .where(eq(trainingSessions.facilitatorId, profileId))
    .orderBy(trainingSessions.createdAt)
    .limit(1);
  return row?.id ?? null;
}

export const {
  handlers,
  auth,
  signIn,
  signOut,
  unstable_update: updateSession,
} = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Usuario', type: 'text' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(raw, request) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;

        const username = parsed.data.username.toLowerCase();
        const ip = clientIpFrom(request.headers);

        // Fuerza bruta: se corta antes de tocar la base o de gastar Argon2.
        if (await isLoginBlocked(username, ip)) return null;

        const [profile] = await db
          .select()
          .from(profiles)
          .where(eq(profiles.username, username))
          .limit(1);

        // Se verifica el hash incluso sin perfil para no filtrar la existencia
        // del usuario por diferencia de tiempo de respuesta.
        const digest =
          profile?.passwordHash ??
          '$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHRzYWx0$0000000000000000000000000000000000000000000';

        const valid = await verifyPassword(digest, parsed.data.password);

        if (!profile || !valid || !profile.isActive) {
          await recordFailedLogin(username, ip);
          return null;
        }

        const trainingSessionId = await resolveTrainingSessionId(profile.id, profile.role);

        await Promise.all([
          db.update(profiles).set({ lastLoginAt: new Date() }).where(eq(profiles.id, profile.id)),
          clearLoginAttempts(username, ip),
        ]);

        return {
          id: profile.id,
          name: profile.fullName,
          email: profile.email ?? undefined,
          role: profile.role,
          organizationId: profile.organizationId,
          trainingSessionId,
          mustChangePassword: profile.mustChangePassword,
          fullName: profile.fullName,
          username: profile.username,
        };
      },
    }),
  ],
});
