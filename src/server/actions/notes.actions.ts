'use server';

import { fail, fromZodError, ok, type ActionResult } from '@/lib/action-result';
import {
  createNoteSchema,
  deleteNoteSchema,
  moveNoteSchema,
  updateNoteColorSchema,
  updateNoteTextSchema,
} from '@/lib/validation/notes';

import * as notes from '../services/notes.service';
import { NotAllowedError } from '../services/notes.service';
import type { NoteDto } from '../services/canvas.service';
import { requireUser } from '../session';

/**
 * Server Actions de post-its.
 * Patrón obligatorio (docs/09): autenticar → validar con Zod → autorizar el
 * recurso → ejecutar. La autorización por propiedad vive en el servicio, que
 * la resuelve con un join y no confía en el id recibido.
 *
 * No se llama a revalidatePath: el lienzo es de escritura optimista y un
 * refresco del servidor pisaría el estado local del cliente.
 */
async function guard<T>(run: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return ok(await run());
  } catch (error) {
    if (error instanceof NotAllowedError) return fail(error.message);
    console.error('[notes.actions]', error);
    return fail('No se pudo guardar el cambio. Inténtalo de nuevo.');
  }
}

export async function createNoteAction(input: unknown): Promise<ActionResult<NoteDto>> {
  const user = await requireUser();
  const parsed = createNoteSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error.issues);

  return guard(() => notes.createNote(user, parsed.data));
}

export async function updateNoteTextAction(input: unknown): Promise<ActionResult<void>> {
  const user = await requireUser();
  const parsed = updateNoteTextSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error.issues);

  return guard(() => notes.updateNoteText(user, parsed.data.noteId, parsed.data.text));
}

export async function updateNoteColorAction(input: unknown): Promise<ActionResult<void>> {
  const user = await requireUser();
  const parsed = updateNoteColorSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error.issues);

  return guard(() => notes.updateNoteColor(user, parsed.data.noteId, parsed.data.color));
}

export async function moveNoteAction(input: unknown): Promise<ActionResult<void>> {
  const user = await requireUser();
  const parsed = moveNoteSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error.issues);

  return guard(() =>
    notes.moveNote(user, parsed.data.noteId, {
      moduleKey: parsed.data.moduleKey,
      positionX: parsed.data.positionX,
      positionY: parsed.data.positionY,
    }),
  );
}

export async function deleteNoteAction(input: unknown): Promise<ActionResult<void>> {
  const user = await requireUser();
  const parsed = deleteNoteSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error.issues);

  return guard(() => notes.deleteNote(user, parsed.data.noteId));
}
