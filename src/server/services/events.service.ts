import 'server-only';

import { and, asc, eq, gt, sql } from 'drizzle-orm';

import { db } from '@/db';
import { activityEvents } from '@/db/schema';

/** Evento tal como viaja al cliente: ids y contadores, nunca el texto de las notas. */
export interface LiveEvent {
  id: number;
  type: string;
  canvasId: string | null;
  actorId: string | null;
  at: string;
  payload: Record<string, unknown>;
}

export const EVENTS_PAGE_SIZE = 100;

export async function listEventsSince(
  trainingSessionId: string,
  since: number,
  limit = EVENTS_PAGE_SIZE,
): Promise<LiveEvent[]> {
  const rows = await db
    .select({
      id: activityEvents.id,
      type: activityEvents.type,
      canvasId: activityEvents.canvasId,
      actorId: activityEvents.actorId,
      createdAt: activityEvents.createdAt,
      payload: activityEvents.payload,
    })
    .from(activityEvents)
    .where(
      and(eq(activityEvents.trainingSessionId, trainingSessionId), gt(activityEvents.id, since)),
    )
    .orderBy(asc(activityEvents.id))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    canvasId: row.canvasId,
    actorId: row.actorId,
    at: row.createdAt.toISOString(),
    payload: row.payload ?? {},
  }));
}

/** Cursor actual: el cliente arranca desde aquí y solo pide lo posterior. */
export async function latestCursor(trainingSessionId: string): Promise<number> {
  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${activityEvents.id}), 0)`.mapWith(Number) })
    .from(activityEvents)
    .where(eq(activityEvents.trainingSessionId, trainingSessionId));

  return row?.max ?? 0;
}
