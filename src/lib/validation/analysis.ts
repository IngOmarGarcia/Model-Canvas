import { z } from 'zod';

import { MODULE_KEYS, type ModuleKey } from '@/lib/bmc/modules';

const moduleRef = z
  .enum(MODULE_KEYS as unknown as [ModuleKey, ...ModuleKey[]])
  .nullable()
  .catch(null);

const punto = z.object({
  titulo: z.string().trim().min(1).max(120),
  detalle: z.string().trim().max(600),
  modulo: moduleRef.default(null),
});

const riesgo = z.object({
  titulo: z.string().trim().min(1).max(120),
  detalle: z.string().trim().max(600),
  severidad: z.enum(['baja', 'media', 'alta']).catch('media'),
});

const recomendacion = z.object({
  titulo: z.string().trim().min(1).max(120),
  detalle: z.string().trim().max(600),
  prioridad: z.coerce.number().int().min(1).max(5).catch(3),
});

/**
 * Contrato de salida del análisis (docs/08). La respuesta del modelo se valida
 * contra esto ANTES de guardarla; si no valida, se reintenta una vez y luego se
 * marca el análisis como fallido. Nunca se muestra una salida sin validar.
 */
export const analysisResultSchema = z.object({
  resumen: z.string().trim().min(1).max(600),
  fortalezas: z.array(punto).max(10).default([]),
  debilidades: z.array(punto).max(10).default([]),
  riesgos: z.array(riesgo).max(10).default([]),
  recomendaciones: z.array(recomendacion).max(10).default([]),
  puntuacion: z.coerce.number().int().min(0).max(100),
});

export type AnalysisResultInput = z.infer<typeof analysisResultSchema>;

export const requestAnalysisSchema = z.object({
  scope: z.enum(['canvas', 'session']),
  canvasId: z.string().uuid().optional(),
  /** Solo el facilitador puede forzar un análisis nuevo ignorando la caché. */
  force: z.boolean().optional().default(false),
});

/**
 * Extrae el JSON de la respuesta aunque venga envuelto en texto o en un bloque
 * de código: algunos modelos añaden preámbulo pese a las instrucciones.
 */
export function extractJson(raw: string): unknown {
  const trimmed = raw.trim();

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const first = candidate.indexOf('{');
    const last = candidate.lastIndexOf('}');
    if (first === -1 || last <= first) throw new Error('La respuesta no contiene JSON válido.');
    return JSON.parse(candidate.slice(first, last + 1));
  }
}
