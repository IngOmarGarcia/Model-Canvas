import 'server-only';

import { and, count, eq, gte, sql } from 'drizzle-orm';

import { db } from '@/db';
import { canvases, trainingParticipants } from '@/db/schema';

export interface SessionSummary {
  participants: number;
  activeParticipants: number;
  startedCanvases: number;
  completedCanvases: number;
  averageProgress: number;
}

const ACTIVE_WINDOW_MINUTES = 5;

/** Métricas del Resumen. Se apoyan en los contadores desnormalizados del lienzo. */
export async function getSessionSummary(trainingSessionId: string): Promise<SessionSummary> {
  const since = new Date(Date.now() - ACTIVE_WINDOW_MINUTES * 60_000);

  const [participantRow] = await db
    .select({ total: count() })
    .from(trainingParticipants)
    .where(eq(trainingParticipants.trainingSessionId, trainingSessionId));

  const [activeRow] = await db
    .select({ total: count() })
    .from(trainingParticipants)
    .where(
      and(
        eq(trainingParticipants.trainingSessionId, trainingSessionId),
        gte(trainingParticipants.lastSeenAt, since),
      ),
    );

  const [canvasRow] = await db
    .select({
      started: sql<number>`count(*) filter (where ${canvases.status} <> 'not_started')`.mapWith(
        Number,
      ),
      completed: sql<number>`count(*) filter (where ${canvases.status} = 'completed')`.mapWith(
        Number,
      ),
      avgFilled: sql<number>`coalesce(avg(${canvases.filledModules}), 0)`.mapWith(Number),
    })
    .from(canvases)
    .where(
      and(
        eq(canvases.trainingSessionId, trainingSessionId),
        eq(canvases.kind, 'participant'),
      ),
    );

  return {
    participants: participantRow?.total ?? 0,
    activeParticipants: activeRow?.total ?? 0,
    startedCanvases: canvasRow?.started ?? 0,
    completedCanvases: canvasRow?.completed ?? 0,
    averageProgress: Math.round(((canvasRow?.avgFilled ?? 0) / 9) * 100),
  };
}
