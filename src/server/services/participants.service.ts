import 'server-only';

import { and, asc, desc, eq, inArray, like, sql } from 'drizzle-orm';

import { db } from '@/db';
import type { CanvasStatus, ParticipantStatus } from '@/db/schema/enums';
import {
  activityEvents,
  canvasModules,
  canvases,
  profiles,
  trainingParticipants,
  trainingSessions,
} from '@/db/schema';
import { MODULES_IN_ORDER, type ModuleKey } from '@/lib/bmc/modules';
import { encryptSecret, decryptSecret } from '@/lib/crypto';
import { generateTempPassword, generateUsername, hashPassword, withSuffix } from '@/lib/password';

import type { CurrentUser } from '../session';

/** El facilitador no administra esta capacitación. */
export class NotAllowedError extends Error {
  constructor(message = 'No tienes permiso sobre esta capacitación.') {
    super(message);
    this.name = 'NotAllowedError';
  }
}

export interface ParticipantRow {
  profileId: string;
  fullName: string;
  username: string;
  email: string | null;
  status: ParticipantStatus;
  isActive: boolean;
  mustChangePassword: boolean;
  lastSeenAt: Date | null;
  canvasId: string | null;
  canvasStatus: CanvasStatus;
  noteCount: number;
  filledModules: number;
  lastActivityAt: Date | null;
  /** Notas por módulo, para dibujar la miniatura sin traer los post-its. */
  moduleCounts: Record<string, number>;
  hasStoredCredentials: boolean;
}

export interface IssuedCredentials {
  fullName: string;
  username: string;
  password: string;
}

/**
 * Verifica que el facilitador administre la capacitación indicada.
 * Se resuelve con un join contra su organización: no se confía en el id recibido.
 */
export async function assertOwnsSession(user: CurrentUser, trainingSessionId: string) {
  if (user.role !== 'facilitator') throw new NotAllowedError();

  const [row] = await db
    .select({ id: trainingSessions.id, organizationId: trainingSessions.organizationId })
    .from(trainingSessions)
    .where(
      and(
        eq(trainingSessions.id, trainingSessionId),
        eq(trainingSessions.facilitatorId, user.id),
        eq(trainingSessions.organizationId, user.organizationId),
      ),
    )
    .limit(1);

  if (!row) throw new NotAllowedError();
  return row;
}

export async function listParticipants(
  user: CurrentUser,
  trainingSessionId: string,
): Promise<ParticipantRow[]> {
  await assertOwnsSession(user, trainingSessionId);

  const rows = await db
    .select({
      profileId: profiles.id,
      fullName: profiles.fullName,
      username: profiles.username,
      email: profiles.email,
      isActive: profiles.isActive,
      mustChangePassword: profiles.mustChangePassword,
      status: trainingParticipants.status,
      lastSeenAt: trainingParticipants.lastSeenAt,
      tempPassword: trainingParticipants.tempPasswordCiphertext,
      canvasId: canvases.id,
      canvasStatus: canvases.status,
      noteCount: canvases.noteCount,
      filledModules: canvases.filledModules,
      lastActivityAt: canvases.lastActivityAt,
    })
    .from(trainingParticipants)
    .innerJoin(profiles, eq(profiles.id, trainingParticipants.profileId))
    .leftJoin(
      canvases,
      and(
        eq(canvases.ownerId, trainingParticipants.profileId),
        eq(canvases.trainingSessionId, trainingSessionId),
        eq(canvases.kind, 'participant'),
      ),
    )
    .where(eq(trainingParticipants.trainingSessionId, trainingSessionId))
    .orderBy(asc(profiles.fullName));

  const canvasIds = rows.map((r) => r.canvasId).filter((id): id is string => Boolean(id));

  // Una sola consulta para los contadores por módulo de todos los lienzos.
  const moduleRows = canvasIds.length
    ? await db
        .select({
          canvasId: canvasModules.canvasId,
          moduleKey: canvasModules.moduleKey,
          noteCount: canvasModules.noteCount,
        })
        .from(canvasModules)
        .where(inArray(canvasModules.canvasId, canvasIds))
    : [];

  const countsByCanvas = new Map<string, Record<string, number>>();
  for (const row of moduleRows) {
    const bucket = countsByCanvas.get(row.canvasId) ?? {};
    bucket[row.moduleKey] = row.noteCount;
    countsByCanvas.set(row.canvasId, bucket);
  }

  return rows.map((row) => ({
    profileId: row.profileId,
    fullName: row.fullName,
    username: row.username,
    email: row.email,
    status: row.status,
    isActive: row.isActive,
    mustChangePassword: row.mustChangePassword,
    lastSeenAt: row.lastSeenAt,
    canvasId: row.canvasId,
    canvasStatus: row.canvasStatus ?? 'not_started',
    noteCount: row.noteCount ?? 0,
    filledModules: row.filledModules ?? 0,
    lastActivityAt: row.lastActivityAt,
    moduleCounts: row.canvasId ? (countsByCanvas.get(row.canvasId) ?? {}) : {},
    hasStoredCredentials: Boolean(row.tempPassword),
  }));
}

/** Usuario libre dentro de la organización: nombre.apellido, con sufijo si choca. */
async function allocateUsername(organizationId: string, fullName: string): Promise<string> {
  const base = generateUsername(fullName);

  const taken = await db
    .select({ username: profiles.username })
    .from(profiles)
    .where(and(eq(profiles.organizationId, organizationId), like(profiles.username, `${base}%`)));

  const used = new Set(taken.map((t) => t.username));

  let n = 1;
  while (used.has(withSuffix(base, n))) n += 1;
  return withSuffix(base, n);
}

async function insertParticipant(
  user: CurrentUser,
  trainingSessionId: string,
  input: { fullName: string; email?: string },
): Promise<IssuedCredentials> {
  const username = await allocateUsername(user.organizationId, input.fullName);
  const password = generateTempPassword();
  const passwordHash = await hashPassword(password);

  await db.transaction(async (tx) => {
    const [profile] = await tx
      .insert(profiles)
      .values({
        organizationId: user.organizationId,
        username,
        email: input.email?.toLowerCase() ?? null,
        fullName: input.fullName,
        passwordHash,
        role: 'participant',
        isActive: true,
        mustChangePassword: true,
      })
      .returning();

    await tx.insert(trainingParticipants).values({
      trainingSessionId,
      profileId: profile.id,
      status: 'active',
      // Se conserva cifrada solo hasta el primer inicio de sesión (docs/09).
      tempPasswordCiphertext: encryptSecret(password),
      credentialsIssuedAt: new Date(),
    });

    const [canvas] = await tx
      .insert(canvases)
      .values({
        trainingSessionId,
        ownerId: profile.id,
        kind: 'participant',
        title: `Lienzo de ${profile.fullName}`,
      })
      .returning();

    await tx.insert(canvasModules).values(
      MODULES_IN_ORDER.map((m) => ({
        canvasId: canvas.id,
        moduleKey: m.key,
        orderIndex: m.order,
      })),
    );

    await tx.insert(activityEvents).values({
      organizationId: user.organizationId,
      trainingSessionId,
      canvasId: canvas.id,
      actorId: user.id,
      type: 'participant.created',
      payload: { profileId: profile.id },
    });
  });

  return { fullName: input.fullName, username, password };
}

export async function createParticipant(
  user: CurrentUser,
  trainingSessionId: string,
  input: { fullName: string; email?: string },
): Promise<IssuedCredentials> {
  await assertOwnsSession(user, trainingSessionId);
  return insertParticipant(user, trainingSessionId, input);
}

export async function createParticipants(
  user: CurrentUser,
  trainingSessionId: string,
  rows: { fullName: string; email?: string }[],
): Promise<IssuedCredentials[]> {
  await assertOwnsSession(user, trainingSessionId);

  const issued: IssuedCredentials[] = [];
  // En serie: cada alta necesita ver los usuarios ya asignados para no chocar.
  for (const row of rows) {
    issued.push(await insertParticipant(user, trainingSessionId, row));
  }
  return issued;
}

/** Comprueba que el participante pertenezca a una capacitación de este facilitador. */
async function assertOwnsParticipant(user: CurrentUser, profileId: string) {
  const [row] = await db
    .select({
      trainingSessionId: trainingParticipants.trainingSessionId,
      fullName: profiles.fullName,
      username: profiles.username,
    })
    .from(trainingParticipants)
    .innerJoin(profiles, eq(profiles.id, trainingParticipants.profileId))
    .innerJoin(trainingSessions, eq(trainingSessions.id, trainingParticipants.trainingSessionId))
    .where(
      and(
        eq(trainingParticipants.profileId, profileId),
        eq(trainingSessions.facilitatorId, user.id),
        eq(trainingSessions.organizationId, user.organizationId),
      ),
    )
    .limit(1);

  if (!row) throw new NotAllowedError('Ese participante no está en tus capacitaciones.');
  return row;
}

export async function resetParticipantPassword(
  user: CurrentUser,
  profileId: string,
): Promise<IssuedCredentials> {
  const participant = await assertOwnsParticipant(user, profileId);

  const password = generateTempPassword();
  const passwordHash = await hashPassword(password);

  await db.transaction(async (tx) => {
    await tx
      .update(profiles)
      .set({ passwordHash, mustChangePassword: true })
      .where(eq(profiles.id, profileId));

    await tx
      .update(trainingParticipants)
      .set({
        tempPasswordCiphertext: encryptSecret(password),
        credentialsIssuedAt: new Date(),
      })
      .where(eq(trainingParticipants.profileId, profileId));
  });

  return { fullName: participant.fullName, username: participant.username, password };
}

export async function setParticipantActive(
  user: CurrentUser,
  profileId: string,
  isActive: boolean,
) {
  const participant = await assertOwnsParticipant(user, profileId);

  await db.transaction(async (tx) => {
    await tx.update(profiles).set({ isActive }).where(eq(profiles.id, profileId));

    await tx
      .update(trainingParticipants)
      .set({ status: isActive ? 'active' : 'disabled' })
      .where(eq(trainingParticipants.profileId, profileId));

    if (!isActive) {
      await tx.insert(activityEvents).values({
        organizationId: user.organizationId,
        trainingSessionId: participant.trainingSessionId,
        actorId: user.id,
        type: 'participant.disabled',
        payload: { profileId },
      });
    }
  });
}

/** Elimina al participante; el borrado en cascada arrastra lienzo, notas y análisis. */
export async function deleteParticipant(user: CurrentUser, profileId: string) {
  await assertOwnsParticipant(user, profileId);
  await db.delete(profiles).where(eq(profiles.id, profileId));
}

/**
 * Credenciales aún recuperables (las que no se han usado todavía).
 * Solo el facilitador dueño de la capacitación puede descifrarlas.
 */
export async function listStoredCredentials(
  user: CurrentUser,
  trainingSessionId: string,
): Promise<IssuedCredentials[]> {
  await assertOwnsSession(user, trainingSessionId);

  const rows = await db
    .select({
      fullName: profiles.fullName,
      username: profiles.username,
      ciphertext: trainingParticipants.tempPasswordCiphertext,
    })
    .from(trainingParticipants)
    .innerJoin(profiles, eq(profiles.id, trainingParticipants.profileId))
    .where(eq(trainingParticipants.trainingSessionId, trainingSessionId))
    .orderBy(asc(profiles.fullName));

  return rows
    .filter((row) => Boolean(row.ciphertext))
    .map((row) => ({
      fullName: row.fullName,
      username: row.username,
      password: decryptSecret(row.ciphertext as string),
    }));
}

/** Latido de presencia. Se escribe como mucho una vez por minuto. */
export async function touchPresence(user: CurrentUser) {
  if (user.role !== 'participant') return;

  await db
    .update(trainingParticipants)
    .set({ lastSeenAt: new Date() })
    .where(
      and(
        eq(trainingParticipants.profileId, user.id),
        sql`${trainingParticipants.lastSeenAt} is null or ${trainingParticipants.lastSeenAt} < now() - interval '1 minute'`,
      ),
    );
}

/** Últimos eventos de la capacitación, con el nombre del actor ya resuelto. */
export async function listRecentActivity(
  user: CurrentUser,
  trainingSessionId: string,
  limit = 20,
) {
  await assertOwnsSession(user, trainingSessionId);

  return db
    .select({
      id: activityEvents.id,
      type: activityEvents.type,
      createdAt: activityEvents.createdAt,
      actorName: profiles.fullName,
      moduleKey: sql<ModuleKey | null>`${activityEvents.payload} ->> 'moduleKey'`,
    })
    .from(activityEvents)
    .leftJoin(profiles, eq(profiles.id, activityEvents.actorId))
    .where(eq(activityEvents.trainingSessionId, trainingSessionId))
    .orderBy(desc(activityEvents.id))
    .limit(limit);
}
