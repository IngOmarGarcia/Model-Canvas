import 'server-only';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';

import { db } from '@/db';
import type { UserRole } from '@/db/schema/enums';
import { profiles } from '@/db/schema';
import { homeForRole } from '@/lib/navigation';

import { auth } from './auth';

export interface CurrentUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  organizationId: string;
  trainingSessionId: string | null;
  mustChangePassword: boolean;
}

/**
 * Usuario autenticado, revalidado contra la base de datos.
 * La comprobación de `is_active` se hace aquí y no en el JWT: desactivar una
 * cuenta corta el acceso de inmediato, sin esperar a que expire el token.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [profile] = await db
    .select({
      id: profiles.id,
      username: profiles.username,
      fullName: profiles.fullName,
      role: profiles.role,
      organizationId: profiles.organizationId,
      isActive: profiles.isActive,
      mustChangePassword: profiles.mustChangePassword,
    })
    .from(profiles)
    .where(eq(profiles.id, session.user.id))
    .limit(1);

  if (!profile || !profile.isActive) return null;

  return {
    id: profile.id,
    username: profile.username,
    fullName: profile.fullName,
    role: profile.role,
    organizationId: profile.organizationId,
    trainingSessionId: session.user.trainingSessionId,
    mustChangePassword: profile.mustChangePassword,
  };
}

/** Exige sesión válida; si no la hay, envía al inicio de sesión. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

/**
 * Exige sesión válida con un rol concreto.
 * La ruta nunca es la autorización: cada Server Action y cada route handler
 * vuelve a llamar a este helper. Ver docs/03-roles-y-permisos.md.
 */
export async function requireRole(role: UserRole): Promise<CurrentUser> {
  const user = await requireUser();

  // Se devuelve al usuario a su propia área en lugar de revelar que la ruta existe.
  if (user.role !== role) {
    redirect(homeForRole(user.role));
  }

  return user;
}
