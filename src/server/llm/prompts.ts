import 'server-only';

import { MODULES_IN_ORDER, type ModuleKey } from '@/lib/bmc/modules';

export interface SerializableNote {
  moduleKey: ModuleKey;
  text: string;
}

const SCHEMA_HINT = `{
  "resumen": "string, máximo 600 caracteres",
  "fortalezas": [{ "titulo": "string", "detalle": "string", "modulo": "clave del módulo o null" }],
  "debilidades": [{ "titulo": "string", "detalle": "string", "modulo": "clave del módulo o null" }],
  "riesgos": [{ "titulo": "string", "detalle": "string", "severidad": "baja|media|alta" }],
  "recomendaciones": [{ "titulo": "string", "detalle": "string", "prioridad": 1 }],
  "puntuacion": 0
}`;

const MODULE_KEY_LIST = MODULES_IN_ORDER.map((m) => m.key).join(', ');

/**
 * Prompt de sistema. El contexto de los nueve módulos sale de lib/bmc/modules.ts
 * para que el modelo evalúe con la misma terminología que ve el participante.
 */
export function buildSystemPrompt(customInstructions?: string | null): string {
  const modules = MODULES_IN_ORDER.map(
    (m) => `${m.order}. ${m.name} (${m.key}): ${m.description}`,
  ).join('\n');

  const base = `Eres un mentor experto en modelos de negocio que acompaña una capacitación sobre el Business Model Canvas de Osterwalder y Pigneur.

Los nueve módulos, en su orden metodológico:
${modules}

Reglas de tu respuesta:
- Responde ÚNICAMENTE con un objeto JSON válido que cumpla este esquema, sin texto antes ni después y sin bloques de código:
${SCHEMA_HINT}
- El campo "modulo" debe ser exactamente una de estas claves o null: ${MODULE_KEY_LIST}.
- Escribe en español, con tono formativo, concreto y accionable.
- No inventes datos que no estén en el lienzo. Si un módulo está vacío, trátalo como una debilidad.
- "puntuacion" es un entero de 0 a 100 que pondera: cobertura de los nueve módulos, coherencia entre segmentos de mercado y propuesta de valor, y viabilidad económica (relación entre fuentes de ingresos y estructura de costes).
- Máximo 5 elementos por lista. Cada "detalle" no debe pasar de 600 caracteres.`;

  if (!customInstructions?.trim()) return base;

  // Las instrucciones personalizadas van al final y subordinadas al formato.
  return `${base}

Instrucciones adicionales del facilitador (respétalas siempre que no contradigan el formato JSON anterior):
"""
${customInstructions.trim()}
"""`;
}

/** Límites de entrada para acotar el costo (docs/08). */
export const MAX_NOTES = 300;
export const MAX_CHARS = 40_000;

export interface SerializedCanvas {
  text: string;
  truncated: boolean;
}

/**
 * Serializa un lienzo por módulo en orden metodológico. Solo va el texto de las
 * notas: nada de nombres, correos, ids ni posiciones (docs/09, privacidad).
 */
export function serializeCanvas(notes: SerializableNote[]): SerializedCanvas {
  const byModule = new Map<ModuleKey, string[]>();
  let truncated = false;

  for (const note of notes) {
    const text = note.text.trim();
    if (!text) continue;
    const bucket = byModule.get(note.moduleKey) ?? [];
    bucket.push(text);
    byModule.set(note.moduleKey, bucket);
  }

  const lines: string[] = [];
  let total = 0;
  let count = 0;

  for (const m of MODULES_IN_ORDER) {
    const items = byModule.get(m.key) ?? [];
    lines.push(`\n## ${m.order}. ${m.name}`);

    if (items.length === 0) {
      lines.push('(vacío)');
      continue;
    }

    for (const item of items) {
      // Se truncan las notas sobrantes en lugar de mandar un prompt gigante.
      if (count >= MAX_NOTES || total + item.length > MAX_CHARS) {
        truncated = true;
        break;
      }
      lines.push(`- ${item}`);
      total += item.length;
      count += 1;
    }
  }

  return { text: lines.join('\n').trim(), truncated };
}

export function buildCanvasPrompt(notes: SerializableNote[]): SerializedCanvas {
  const serialized = serializeCanvas(notes);
  return {
    ...serialized,
    text: `Analiza este Business Model Canvas y devuelve el JSON solicitado.\n\n${serialized.text}`,
  };
}

/**
 * Análisis general de la capacitación. Los lienzos van anonimizados
 * ("Participante 1", "Participante 2"): el modelo no recibe nombres.
 */
export function buildSessionPrompt(canvases: SerializableNote[][]): SerializedCanvas {
  const blocks: string[] = [];
  let truncated = false;

  canvases.forEach((notes, index) => {
    const serialized = serializeCanvas(notes);
    if (serialized.truncated) truncated = true;
    blocks.push(`\n# Participante ${index + 1}\n${serialized.text}`);
  });

  return {
    truncated,
    text: `Analiza en conjunto los lienzos de esta capacitación y devuelve el JSON solicitado.

Busca patrones comunes, vacíos que se repiten entre participantes y recomendaciones para el grupo. La "puntuacion" debe reflejar el promedio del grupo.
${blocks.join('\n')}`,
  };
}
