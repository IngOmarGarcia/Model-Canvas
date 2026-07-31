'use server';

import { eq } from 'drizzle-orm';
import { AuthError } from 'next-auth';

import { db } from '@/db';
import { profiles } from '@/db/schema';
import { fail, fromZodError, ok, type ActionResult } from '@/lib/action-result';
import { hashPassword, verifyPassword } from '@/lib/password';
import { changePasswordSchema, loginSchema } from '@/lib/validation/auth';

import { signIn, signOut, updateSession } from '../auth';
import { requireUser } from '../session';

export async function loginAction(input: unknown): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error.issues);

  try {
    await signIn('credentials', {
      username: parsed.data.username.toLowerCase(),
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      // Mensaje genérico e idéntico para usuario inexistente, contraseña
      // incorrecta y cuenta desactivada.
      return fail('Usuario o contraseña incorrectos.');
    }
    throw error;
  }

  // El middleware envía a la pantalla correcta según rol y estado de contraseña.
  return ok({ redirectTo: '/' });
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: '/login' });
}

export async function changePasswordAction(input: unknown): Promise<ActionResult<void>> {
  const user = await requireUser();

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error.issues);

  const [profile] = await db
    .select({ passwordHash: profiles.passwordHash })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (!profile) return fail('No se encontró tu cuenta.');

  const valid = await verifyPassword(profile.passwordHash, parsed.data.currentPassword);
  if (!valid) {
    return fail('La contraseña actual no es correcta.', {
      currentPassword: ['La contraseña actual no es correcta.'],
    });
  }

  await db
    .update(profiles)
    .set({
      passwordHash: await hashPassword(parsed.data.newPassword),
      mustChangePassword: false,
    })
    .where(eq(profiles.id, user.id));

  // Refresca el token para que el middleware deje de forzar el cambio.
  await updateSession({ mustChangePassword: false } as never);

  return ok();
}
