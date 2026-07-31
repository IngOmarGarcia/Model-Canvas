import { z } from 'zod';

export const FULL_NAME_MAX = 120;
export const BULK_MAX_ROWS = 200;

const fullName = z
  .string()
  .trim()
  .min(2, 'El nombre es demasiado corto')
  .max(FULL_NAME_MAX, `El nombre no puede pasar de ${FULL_NAME_MAX} caracteres`);

const email = z
  .string()
  .trim()
  .email('Correo no válido')
  .max(180)
  .optional()
  .or(z.literal('').transform(() => undefined));

export const createParticipantSchema = z.object({
  fullName,
  email,
});

export const bulkParticipantsSchema = z.object({
  /** Un nombre por línea; también acepta "Nombre, correo" pegado de una hoja. */
  raw: z.string().trim().min(1, 'Escribe al menos un nombre'),
});

export const participantIdSchema = z.object({
  profileId: z.string().uuid(),
});

export const setParticipantActiveSchema = z.object({
  profileId: z.string().uuid(),
  isActive: z.boolean(),
});

export type CreateParticipantInput = z.infer<typeof createParticipantSchema>;
export type BulkParticipantsInput = z.infer<typeof bulkParticipantsSchema>;

export interface ParsedBulkRow {
  fullName: string;
  email?: string;
}

/**
 * Convierte el texto pegado en filas. Acepta "Nombre", "Nombre, correo" y
 * "Nombre<TAB>correo". Descarta líneas vacías y nombres repetidos.
 */
export function parseBulkRows(raw: string): { rows: ParsedBulkRow[]; skipped: number } {
  const seen = new Set<string>();
  const rows: ParsedBulkRow[] = [];
  let skipped = 0;

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const [namePart, emailPart] = trimmed.split(/[\t;,]/).map((part) => part.trim());
    const parsed = createParticipantSchema.safeParse({
      fullName: namePart,
      email: emailPart || undefined,
    });

    if (!parsed.success) {
      skipped += 1;
      continue;
    }

    const key = parsed.data.fullName.toLowerCase();
    if (seen.has(key)) {
      skipped += 1;
      continue;
    }

    seen.add(key);
    rows.push(parsed.data);
  }

  return { rows: rows.slice(0, BULK_MAX_ROWS), skipped };
}
