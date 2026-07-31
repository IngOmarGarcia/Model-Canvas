import 'server-only';

import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/db';
import type { CanvasKind } from '@/db/schema/enums';
import { canvasModules, canvases, stickyNotes } from '@/db/schema';
import { MODULES_IN_ORDER, type ModuleKey } from '@/lib/bmc/modules';
import type { NoteColor } from '@/lib/colors';

import type { CurrentUser } from '../session';

export interface NoteDto {
  id: string;
  moduleKey: ModuleKey;
  text: string;
  color: NoteColor;
  x: number;
  y: number;
  order: number;
}

export interface CanvasDto {
  id: string;
  title: string;
  status: 'not_started' | 'in_progress' | 'completed';
  noteCount: number;
  filledModules: number;
  notes: NoteDto[];
}

/**
 * Lienzo propio del usuario. Se crea con sus nueve módulos si aún no existe,
 * de modo que un participante dado de alta fuera de la semilla siempre tenga
 * dónde trabajar.
 */
export async function getOrCreateOwnCanvas(
  user: CurrentUser,
  trainingSessionId: string,
): Promise<CanvasDto> {
  const kind: CanvasKind = user.role === 'facilitator' ? 'facilitator' : 'participant';

  const existing = await findCanvas(trainingSessionId, user.id, kind);
  const canvas = existing ?? (await createCanvas(trainingSessionId, user, kind));

  return { ...canvas, notes: await listNotes(canvas.id) };
}

/** Lectura de un lienzo ajeno (facilitador en modo lectura). No crea nada. */
export async function getCanvasById(canvasId: string): Promise<CanvasDto | null> {
  const [row] = await db
    .select({
      id: canvases.id,
      title: canvases.title,
      status: canvases.status,
      noteCount: canvases.noteCount,
      filledModules: canvases.filledModules,
    })
    .from(canvases)
    .where(eq(canvases.id, canvasId))
    .limit(1);

  if (!row) return null;

  return { ...row, notes: await listNotes(row.id) };
}

async function findCanvas(trainingSessionId: string, ownerId: string, kind: CanvasKind) {
  const [row] = await db
    .select({
      id: canvases.id,
      title: canvases.title,
      status: canvases.status,
      noteCount: canvases.noteCount,
      filledModules: canvases.filledModules,
    })
    .from(canvases)
    .where(
      and(
        eq(canvases.trainingSessionId, trainingSessionId),
        eq(canvases.ownerId, ownerId),
        eq(canvases.kind, kind),
      ),
    )
    .limit(1);

  return row ?? null;
}

async function createCanvas(trainingSessionId: string, user: CurrentUser, kind: CanvasKind) {
  return db.transaction(async (tx) => {
    const [canvas] = await tx
      .insert(canvases)
      .values({
        trainingSessionId,
        ownerId: user.id,
        kind,
        title: kind === 'facilitator' ? 'Lienzo del facilitador' : `Lienzo de ${user.fullName}`,
      })
      .returning();

    await tx.insert(canvasModules).values(
      MODULES_IN_ORDER.map((m) => ({
        canvasId: canvas.id,
        moduleKey: m.key,
        orderIndex: m.order,
      })),
    );

    return {
      id: canvas.id,
      title: canvas.title,
      status: canvas.status,
      noteCount: canvas.noteCount,
      filledModules: canvas.filledModules,
    };
  });
}

async function listNotes(canvasId: string): Promise<NoteDto[]> {
  const rows = await db
    .select({
      id: stickyNotes.id,
      moduleKey: stickyNotes.moduleKey,
      text: stickyNotes.text,
      color: stickyNotes.color,
      x: stickyNotes.positionX,
      y: stickyNotes.positionY,
      order: stickyNotes.orderIndex,
    })
    .from(stickyNotes)
    .where(eq(stickyNotes.canvasId, canvasId))
    .orderBy(asc(stickyNotes.orderIndex), asc(stickyNotes.createdAt));

  return rows;
}
