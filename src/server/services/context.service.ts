import 'server-only';

import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { organizations, trainingParticipants, trainingSessions } from '@/db/schema';

import type { CurrentUser } from '../session';

export interface WorkspaceContext {
  organizationName: string;
  organizationId: string;
  trainingSessionId: string | null;
  trainingName: string | null;
}

/**
 * Datos de encabezado comunes a todas las pantallas: organización y
 * capacitación activa. La capacitación se resuelve aquí (y no solo en el JWT)
 * para que el facilitador vea la que acaba de crear sin volver a iniciar sesión.
 */
export async function getWorkspaceContext(user: CurrentUser): Promise<WorkspaceContext> {
  const [org] = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, user.organizationId))
    .limit(1);

  const training =
    user.role === 'facilitator'
      ? await findFacilitatorTraining(user)
      : await findParticipantTraining(user);

  return {
    organizationId: org?.id ?? user.organizationId,
    organizationName: org?.name ?? 'Organización',
    trainingSessionId: training?.id ?? null,
    trainingName: training?.name ?? null,
  };
}

async function findFacilitatorTraining(user: CurrentUser) {
  const [row] = await db
    .select({ id: trainingSessions.id, name: trainingSessions.name })
    .from(trainingSessions)
    .where(
      and(
        eq(trainingSessions.organizationId, user.organizationId),
        eq(trainingSessions.facilitatorId, user.id),
      ),
    )
    .orderBy(desc(trainingSessions.createdAt))
    .limit(1);

  return row;
}

async function findParticipantTraining(user: CurrentUser) {
  const [row] = await db
    .select({ id: trainingSessions.id, name: trainingSessions.name })
    .from(trainingParticipants)
    .innerJoin(trainingSessions, eq(trainingSessions.id, trainingParticipants.trainingSessionId))
    .where(eq(trainingParticipants.profileId, user.id))
    .orderBy(desc(trainingParticipants.createdAt))
    .limit(1);

  return row;
}
