import { createHash } from 'node:crypto';

import { MODULES_IN_ORDER, type ModuleKey } from './bmc/modules';

export interface HashableNote {
  moduleKey: ModuleKey;
  text: string;
}

/**
 * Hash del contenido del lienzo, clave de reutilización de análisis (docs/08).
 *
 * Normaliza por módulo en orden metodológico: texto recortado, en minúsculas y
 * sin espacios redundantes, ordenado alfabéticamente. Excluye ids, colores,
 * posiciones y marcas de tiempo: mover o recolorar una nota NO invalida el
 * análisis; cambiar su texto sí.
 */
export function canvasContentHash(notes: HashableNote[]): string {
  const byModule = new Map<ModuleKey, string[]>();

  for (const note of notes) {
    const normalized = note.text.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!normalized) continue;

    const bucket = byModule.get(note.moduleKey);
    if (bucket) bucket.push(normalized);
    else byModule.set(note.moduleKey, [normalized]);
  }

  const payload = MODULES_IN_ORDER.map((m) => [
    m.key,
    (byModule.get(m.key) ?? []).sort((a, b) => a.localeCompare(b, 'es')),
  ]);

  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}
