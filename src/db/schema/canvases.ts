import {
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { canvasKindEnum, canvasStatusEnum, moduleKeyEnum } from './enums';
import { profiles } from './profiles';
import { trainingSessions } from './training';

/**
 * Un lienzo BMC. `noteCount` y `filledModules` son contadores desnormalizados
 * que se mantienen en la misma transacción que la mutación de notas, para que
 * el monitoreo no ejecute agregaciones por participante.
 */
export const canvases = pgTable(
  'canvases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    trainingSessionId: uuid('training_session_id')
      .notNull()
      .references(() => trainingSessions.id, { onDelete: 'cascade' }),
    ownerId: uuid('owner_id').references(() => profiles.id, { onDelete: 'cascade' }),
    kind: canvasKindEnum('kind').notNull(),
    title: text('title').notNull(),
    status: canvasStatusEnum('status').notNull().default('not_started'),
    noteCount: integer('note_count').notNull().default(0),
    filledModules: smallint('filled_modules').notNull().default(0),
    contentHash: text('content_hash'),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('canvases_session_owner_kind_uq').on(t.trainingSessionId, t.ownerId, t.kind),
    index('canvases_session_activity_idx').on(t.trainingSessionId, t.lastActivityAt),
  ],
);

/** Instancia de cada uno de los nueve bloques dentro de un lienzo. */
export const canvasModules = pgTable(
  'canvas_modules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    canvasId: uuid('canvas_id')
      .notNull()
      .references(() => canvases.id, { onDelete: 'cascade' }),
    moduleKey: moduleKeyEnum('module_key').notNull(),
    orderIndex: smallint('order_index').notNull(),
    noteCount: integer('note_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex('canvas_modules_canvas_key_uq').on(t.canvasId, t.moduleKey)],
);

export type Canvas = typeof canvases.$inferSelect;
export type NewCanvas = typeof canvases.$inferInsert;
export type CanvasModule = typeof canvasModules.$inferSelect;
export type NewCanvasModule = typeof canvasModules.$inferInsert;
