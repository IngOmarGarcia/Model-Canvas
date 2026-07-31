import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { canvases } from './canvases';
import { analysisScopeEnum, analysisStatusEnum, llmProviderEnum } from './enums';
import { profiles } from './profiles';
import { trainingSessions } from './training';

/** Resultado estructurado que devuelve el proveedor de IA (validado con Zod). */
export interface AnalysisResult {
  resumen: string;
  fortalezas: { titulo: string; detalle: string; modulo: string | null }[];
  debilidades: { titulo: string; detalle: string; modulo: string | null }[];
  riesgos: { titulo: string; detalle: string; severidad: 'baja' | 'media' | 'alta' }[];
  recomendaciones: { titulo: string; detalle: string; prioridad: number }[];
  puntuacion: number;
}

export const canvasAnalyses = pgTable(
  'canvas_analyses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scope: analysisScopeEnum('scope').notNull(),
    canvasId: uuid('canvas_id').references(() => canvases.id, { onDelete: 'cascade' }),
    trainingSessionId: uuid('training_session_id')
      .notNull()
      .references(() => trainingSessions.id, { onDelete: 'cascade' }),
    requestedBy: uuid('requested_by').references(() => profiles.id, { onDelete: 'set null' }),
    /** Clave de reutilización: sha256 del contenido normalizado del lienzo. */
    contentHash: text('content_hash').notNull(),
    provider: llmProviderEnum('provider').notNull(),
    model: text('model').notNull(),
    status: analysisStatusEnum('status').notNull().default('pending'),
    result: jsonb('result').$type<AnalysisResult>(),
    score: smallint('score'),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    // Reutilización: un único análisis completado por alcance + objetivo + hash.
    // Cubre el caso habitual (alcance 'canvas', canvasId no nulo). En alcance
    // 'session' el canvasId es NULL y Postgres trata los NULL como distintos,
    // así que ahí la deduplicación la garantiza el servicio de análisis
    // consultando por hash antes de llamar al proveedor (Fase 5).
    uniqueIndex('canvas_analyses_reuse_uq')
      .on(t.scope, t.canvasId, t.trainingSessionId, t.contentHash)
      .where(sql`${t.status} = 'completed'`),
    index('canvas_analyses_canvas_created_idx').on(t.canvasId, t.createdAt),
    index('canvas_analyses_requester_created_idx').on(t.requestedBy, t.createdAt),
    check('canvas_analyses_score_range', sql`${t.score} is null or (${t.score} between 0 and 100)`),
  ],
);

export type CanvasAnalysis = typeof canvasAnalyses.$inferSelect;
export type NewCanvasAnalysis = typeof canvasAnalyses.$inferInsert;
