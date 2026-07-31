import { bigserial, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { canvases } from './canvases';
import { organizations } from './organizations';
import { profiles } from './profiles';
import { trainingSessions } from './training';

/** Tipos de evento que viajan por SSE / polling. Ver docs/07-tiempo-real.md. */
export const ACTIVITY_EVENT_TYPES = [
  'note.created',
  'note.updated',
  'note.moved',
  'note.deleted',
  'canvas.progress',
  'canvas.completed',
  'participant.login',
  'participant.created',
  'participant.disabled',
  'analysis.completed',
] as const;

export type ActivityEventType = (typeof ACTIVITY_EVENT_TYPES)[number];

/**
 * Bitácora y cursor del tiempo real. El `id` bigserial es monótono: cliente y
 * servidor solo intercambian "dame lo que haya después de N".
 * El payload guarda ids y campos cambiados, nunca el texto de las notas.
 */
export const activityEvents = pgTable(
  'activity_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    trainingSessionId: uuid('training_session_id')
      .notNull()
      .references(() => trainingSessions.id, { onDelete: 'cascade' }),
    canvasId: uuid('canvas_id').references(() => canvases.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id').references(() => profiles.id, { onDelete: 'set null' }),
    type: text('type').$type<ActivityEventType>().notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('activity_events_session_id_idx').on(t.trainingSessionId, t.id),
    index('activity_events_canvas_id_idx').on(t.canvasId, t.id),
  ],
);

export type ActivityEvent = typeof activityEvents.$inferSelect;
export type NewActivityEvent = typeof activityEvents.$inferInsert;
