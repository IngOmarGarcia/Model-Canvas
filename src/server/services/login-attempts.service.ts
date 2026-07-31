import 'server-only';

import { and, count, eq, gte, lt, or } from 'drizzle-orm';

import { db } from '@/db';
import { loginAttempts } from '@/db/schema';
import { LOGIN_LIMITS, LOGIN_WINDOW_MS } from '@/lib/rate-limit';

const subjectForUser = (username: string) => `user:${username.toLowerCase()}`;
const subjectForIp = (ip: string) => `ip:${ip}`;

/**
 * Dirección del cliente detrás de proxy. Se toma la primera de
 * x-forwarded-for, que es la del cliente original.
 */
export function clientIpFrom(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return headers.get('x-real-ip') ?? 'desconocida';
}

/** ¿Este usuario o esta IP superaron el umbral de fallos recientes? */
export async function isLoginBlocked(username: string, ip: string): Promise<boolean> {
  const since = new Date(Date.now() - LOGIN_WINDOW_MS);

  const [byUser] = await db
    .select({ total: count() })
    .from(loginAttempts)
    .where(
      and(eq(loginAttempts.subject, subjectForUser(username)), gte(loginAttempts.createdAt, since)),
    );

  if ((byUser?.total ?? 0) >= LOGIN_LIMITS.perUsername) return true;

  const [byIp] = await db
    .select({ total: count() })
    .from(loginAttempts)
    .where(and(eq(loginAttempts.subject, subjectForIp(ip)), gte(loginAttempts.createdAt, since)));

  return (byIp?.total ?? 0) >= LOGIN_LIMITS.perIp;
}

/** Registra un fallo y aprovecha para purgar lo que ya salió de la ventana. */
export async function recordFailedLogin(username: string, ip: string): Promise<void> {
  const cutoff = new Date(Date.now() - LOGIN_WINDOW_MS);

  await db.insert(loginAttempts).values([
    { subject: subjectForUser(username) },
    { subject: subjectForIp(ip) },
  ]);

  await db.delete(loginAttempts).where(lt(loginAttempts.createdAt, cutoff));
}

/** Un inicio de sesión correcto limpia el historial de ese usuario y esa IP. */
export async function clearLoginAttempts(username: string, ip: string): Promise<void> {
  await db
    .delete(loginAttempts)
    .where(
      or(
        eq(loginAttempts.subject, subjectForUser(username)),
        eq(loginAttempts.subject, subjectForIp(ip)),
      ),
    );
}
