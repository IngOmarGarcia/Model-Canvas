import { z } from 'zod';

import { MODULE_KEYS, type ModuleKey } from '@/lib/bmc/modules';
import { NOTE_COLOR_KEYS } from '@/lib/colors';

const moduleKey = z.enum(MODULE_KEYS as unknown as [ModuleKey, ...ModuleKey[]]);
const noteColor = z.enum(NOTE_COLOR_KEYS);

/** Fracción 0–1 relativa al área del módulo (docs/04). */
const position = z.number().min(0).max(1);

export const NOTE_TEXT_MAX = 500;

const noteText = z
  .string()
  .max(NOTE_TEXT_MAX, `El texto no puede pasar de ${NOTE_TEXT_MAX} caracteres`);

export const createNoteSchema = z.object({
  canvasId: z.string().uuid(),
  moduleKey,
  text: noteText.default(''),
  color: noteColor,
  positionX: position,
  positionY: position,
});

export const updateNoteTextSchema = z.object({
  noteId: z.string().uuid(),
  text: noteText,
});

export const updateNoteColorSchema = z.object({
  noteId: z.string().uuid(),
  color: noteColor,
});

export const moveNoteSchema = z.object({
  noteId: z.string().uuid(),
  moduleKey,
  positionX: position,
  positionY: position,
});

export const deleteNoteSchema = z.object({
  noteId: z.string().uuid(),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteTextInput = z.infer<typeof updateNoteTextSchema>;
export type UpdateNoteColorInput = z.infer<typeof updateNoteColorSchema>;
export type MoveNoteInput = z.infer<typeof moveNoteSchema>;
export type DeleteNoteInput = z.infer<typeof deleteNoteSchema>;
