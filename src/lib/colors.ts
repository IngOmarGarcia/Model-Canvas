/**
 * Paleta de post-its. Fuente única de verdad: los tokens CSS correspondientes
 * (--note-*, --note-*-fg) viven en src/app/globals.css y cambian por tema.
 */
export const NOTE_COLORS = [
  { key: 'yellow', label: 'Amarillo', uso: 'Ideas generales' },
  { key: 'blue', label: 'Azul', uso: 'Datos y hechos' },
  { key: 'teal', label: 'Turquesa', uso: 'Oportunidades' },
  { key: 'pink', label: 'Rosa', uso: 'Dudas y supuestos' },
  { key: 'green', label: 'Verde', uso: 'Confirmado' },
  { key: 'orange', label: 'Naranja', uso: 'Riesgos y pendientes' },
] as const;

export type NoteColor = (typeof NOTE_COLORS)[number]['key'];

export const NOTE_COLOR_KEYS = NOTE_COLORS.map((c) => c.key) as [NoteColor, ...NoteColor[]];

export const DEFAULT_NOTE_COLOR: NoteColor = 'yellow';

/** Clases utilitarias para pintar una nota con sus tokens de tema. */
export function noteColorClass(color: NoteColor): string {
  return `bg-[var(--note-${color})] text-[var(--note-${color}-fg)]`;
}

export function isNoteColor(value: string): value is NoteColor {
  return NOTE_COLOR_KEYS.includes(value as NoteColor);
}
