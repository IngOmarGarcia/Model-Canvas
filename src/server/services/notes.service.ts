import 'server-only';

import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/db';
import type { ActivityEventType } from '@/db/schema/events';
import { activityEvents, canvasModules, canvases, stickyNotes, trainingSessions } from '@/db/schema';
import { TOTAL_MODULES, type ModuleKey } from '@/lib/bmc/modules';
import type { NoteColor } from '@/lib/colors';
import { canvasContentHash } from '@/lib/hash';

import type { CurrentUser } from '../session';
import type { NoteDto } from './canvas.service';

/** El actor no es dueño del lienzo (o el lienzo no existe). */
export class NotAllowedError extends Error {
  constructor() {
    super('No tienes permiso para modificar este lienzo.');
    this.name = 'NotAllowedError';
  }
}

interface CanvasContext {
  canvasId: string;
  trainingSessionId: string;
  organizationId: string;
}

/**
 * Autorización por propiedad: solo el dueño escribe en su lienzo.
 * El facilitador NO edita lienzos de participantes (docs/03, regla 3).
 * Se resuelve con un join para no confiar en el id que llega de la petición.
 */
async function assertCanEdit(user: CurrentUser, canvasId: string): Promise<CanvasContext> {
  const [row] = await db
    .select({
      canvasId: canvases.id,
      ownerId: canvases.ownerId,
      trainingSessionId: canvases.trainingSessionId,
      organizationId: trainingSessions.organizationId,
    })
    .from(canvases)
    .innerJoin(trainingSessions, eq(trainingSessions.id, canvases.trainingSessionId))
    .where(eq(canvases.id, canvasId))
    .limit(1);

  if (!row || row.ownerId !== user.id || row.organizationId !== user.organizationId) {
    throw new NotAllowedError();
  }

  return {
    canvasId: row.canvasId,
    trainingSessionId: row.trainingSessionId,
    organizationId: row.organizationId,
  };
}

/** Igual que assertCanEdit, pero partiendo de la nota. */
async function assertCanEditNote(user: CurrentUser, noteId: string) {
  const [note] = await db
    .select({ id: stickyNotes.id, canvasId: stickyNotes.canvasId })
    .from(stickyNotes)
    .where(eq(stickyNotes.id, noteId))
    .limit(1);

  if (!note) throw new NotAllowedError();

  const context = await assertCanEdit(user, note.canvasId);
  return { note, context };
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Recalcula, en la MISMA transacción que la mutación, los contadores
 * desnormalizados, el estado, el hash de contenido y la última actividad.
 * Así el monitoreo lee la cuadrícula de participantes sin agregaciones.
 */
async function syncCanvasState(tx: Tx, canvasId: string) {
  const rows = await tx
    .select({ moduleKey: stickyNotes.moduleKey, text: stickyNotes.text })
    .from(stickyNotes)
    .where(eq(stickyNotes.canvasId, canvasId));

  // Un solo statement para los nueve módulos.
  await tx.execute(sql`
    update canvas_modules cm
    set note_count = (
      select count(*) from sticky_notes sn where sn.canvas_module_id = cm.id
    )
    where cm.canvas_id = ${canvasId}
  `);

  const filledModules = new Set(rows.map((r) => r.moduleKey)).size;
  const noteCount = rows.length;

  const [current] = await tx
    .select({ completedAt: canvases.completedAt })
    .from(canvases)
    .where(eq(canvases.id, canvasId))
    .limit(1);

  const status =
    current?.completedAt || filledModules === TOTAL_MODULES
      ? 'completed'
      : noteCount > 0
        ? 'in_progress'
        : 'not_started';

  await tx
    .update(canvases)
    .set({
      noteCount,
      filledModules,
      status,
      contentHash: canvasContentHash(rows),
      lastActivityAt: new Date(),
    })
    .where(eq(canvases.id, canvasId));

  return { noteCount, filledModules, status };
}

async function publish(
  tx: Tx,
  context: CanvasContext,
  actorId: string,
  type: ActivityEventType,
  payload: Record<string, unknown>,
) {
  await tx.insert(activityEvents).values({
    organizationId: context.organizationId,
    trainingSessionId: context.trainingSessionId,
    canvasId: context.canvasId,
    actorId,
    type,
    payload,
  });
}

async function resolveModuleId(tx: Tx, canvasId: string, moduleKey: ModuleKey): Promise<string> {
  const [row] = await tx
    .select({ id: canvasModules.id })
    .from(canvasModules)
    .where(and(eq(canvasModules.canvasId, canvasId), eq(canvasModules.moduleKey, moduleKey)))
    .limit(1);

  if (!row) throw new NotAllowedError();
  return row.id;
}

/** Siguiente orden de apilado: la nota nueva o recién movida queda al frente. */
async function nextOrderIndex(tx: Tx, canvasId: string): Promise<number> {
  const [row] = await tx
    .select({ max: sql<number>`coalesce(max(${stickyNotes.orderIndex}), 0)`.mapWith(Number) })
    .from(stickyNotes)
    .where(eq(stickyNotes.canvasId, canvasId));

  return (row?.max ?? 0) + 1;
}

export async function createNote(
  user: CurrentUser,
  input: {
    canvasId: string;
    moduleKey: ModuleKey;
    text: string;
    color: NoteColor;
    positionX: number;
    positionY: number;
  },
): Promise<NoteDto> {
  const context = await assertCanEdit(user, input.canvasId);

  return db.transaction(async (tx) => {
    const canvasModuleId = await resolveModuleId(tx, input.canvasId, input.moduleKey);
    const orderIndex = await nextOrderIndex(tx, input.canvasId);

    const [note] = await tx
      .insert(stickyNotes)
      .values({
        canvasId: input.canvasId,
        canvasModuleId,
        moduleKey: input.moduleKey,
        authorId: user.id,
        text: input.text,
        color: input.color,
        positionX: input.positionX,
        positionY: input.positionY,
        orderIndex,
      })
      .returning();

    const state = await syncCanvasState(tx, input.canvasId);
    await publish(tx, context, user.id, 'note.created', {
      noteId: note.id,
      moduleKey: input.moduleKey,
      ...state,
    });

    return {
      id: note.id,
      moduleKey: note.moduleKey,
      text: note.text,
      color: note.color,
      x: note.positionX,
      y: note.positionY,
      order: note.orderIndex,
    };
  });
}

export async function updateNoteText(user: CurrentUser, noteId: string, text: string) {
  const { context } = await assertCanEditNote(user, noteId);

  await db.transaction(async (tx) => {
    await tx.update(stickyNotes).set({ text }).where(eq(stickyNotes.id, noteId));

    const state = await syncCanvasState(tx, context.canvasId);
    await publish(tx, context, user.id, 'note.updated', { noteId, ...state });
  });
}

export async function updateNoteColor(user: CurrentUser, noteId: string, color: NoteColor) {
  const { context } = await assertCanEditNote(user, noteId);

  await db.transaction(async (tx) => {
    await tx.update(stickyNotes).set({ color }).where(eq(stickyNotes.id, noteId));

    // El color no altera el hash de contenido, pero sí la actividad del lienzo.
    await tx
      .update(canvases)
      .set({ lastActivityAt: new Date() })
      .where(eq(canvases.id, context.canvasId));

    await publish(tx, context, user.id, 'note.updated', { noteId, color });
  });
}

export async function moveNote(
  user: CurrentUser,
  noteId: string,
  input: { moduleKey: ModuleKey; positionX: number; positionY: number },
) {
  const { note, context } = await assertCanEditNote(user, noteId);

  await db.transaction(async (tx) => {
    const canvasModuleId = await resolveModuleId(tx, note.canvasId, input.moduleKey);
    const orderIndex = await nextOrderIndex(tx, note.canvasId);

    await tx
      .update(stickyNotes)
      .set({
        canvasModuleId,
        moduleKey: input.moduleKey,
        positionX: input.positionX,
        positionY: input.positionY,
        orderIndex,
      })
      .where(eq(stickyNotes.id, noteId));

    const state = await syncCanvasState(tx, note.canvasId);
    await publish(tx, context, user.id, 'note.moved', {
      noteId,
      moduleKey: input.moduleKey,
      ...state,
    });
  });
}

export async function deleteNote(user: CurrentUser, noteId: string) {
  const { note, context } = await assertCanEditNote(user, noteId);

  await db.transaction(async (tx) => {
    await tx.delete(stickyNotes).where(eq(stickyNotes.id, noteId));

    const state = await syncCanvasState(tx, note.canvasId);
    await publish(tx, context, user.id, 'note.deleted', { noteId, ...state });
  });
}
