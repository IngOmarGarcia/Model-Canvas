import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, real, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { canvasModules, canvases } from './canvases';
import { moduleKeyEnum, noteColorEnum } from './enums';
import { profiles } from './profiles';

/**
 * Post-it. `positionX` / `positionY` son fracciones 0–1 relativas al área del
 * módulo: el lienzo se ve igual en proyector, tablet y móvil, y mover una nota
 * a otro módulo es recalcular la fracción, no la coordenada absoluta.
 */
export const stickyNotes = pgTable(
  'sticky_notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    canvasId: uuid('canvas_id')
      .notNull()
      .references(() => canvases.id, { onDelete: 'cascade' }),
    canvasModuleId: uuid('canvas_module_id')
      .notNull()
      .references(() => canvasModules.id, { onDelete: 'cascade' }),
    // Copia del módulo para leer y serializar sin join (prompt de IA, miniaturas).
    moduleKey: moduleKeyEnum('module_key').notNull(),
    authorId: uuid('author_id').references(() => profiles.id, { onDelete: 'set null' }),
    text: text('text').notNull(),
    color: noteColorEnum('color').notNull().default('yellow'),
    positionX: real('position_x').notNull().default(0),
    positionY: real('position_y').notNull().default(0),
    orderIndex: integer('order_index').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('sticky_notes_canvas_updated_idx').on(t.canvasId, t.updatedAt),
    index('sticky_notes_module_order_idx').on(t.canvasModuleId, t.orderIndex),
    check('sticky_notes_text_len', sql`char_length(${t.text}) <= 500`),
    check(
      'sticky_notes_position_range',
      sql`${t.positionX} >= 0 and ${t.positionX} <= 1 and ${t.positionY} >= 0 and ${t.positionY} <= 1`,
    ),
  ],
);

export type StickyNote = typeof stickyNotes.$inferSelect;
export type NewStickyNote = typeof stickyNotes.$inferInsert;
