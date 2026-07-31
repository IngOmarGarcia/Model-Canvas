import type { CSSProperties } from 'react';

import type { ModuleKey } from './modules';

/**
 * Geometría del lienzo tradicional: rejilla de 5 columnas × 3 filas.
 *
 *  ┌──────────┬──────────┬──────────┬──────────┬──────────┐
 *  │          │ 7 Activ. │          │ 4 Relac. │          │
 *  │ 8 Asoc.  ├──────────┤ 2 Propu. ├──────────┤ 1 Segm.  │
 *  │          │ 6 Recur. │          │ 3 Canal. │          │
 *  ├──────────┴──────────┴────┬─────┴──────────┴──────────┤
 *  │    9 Estructura costes    │   5 Fuentes de ingresos   │
 *  └───────────────────────────┴───────────────────────────┘
 *
 * El orden de trabajo (order 1–9) NO coincide con la posición visual.
 */
export interface ModulePlacement {
  key: ModuleKey;
  /** Línea de inicio y de fin en la rejilla CSS (1-indexado). */
  colStart: number;
  colEnd: number;
  rowStart: number;
  rowEnd: number;
}

export const CANVAS_GRID_COLUMNS = 10; // 10 columnas para permitir mitades en la fila inferior
export const CANVAS_GRID_ROWS = 3;

export const CANVAS_LAYOUT: readonly ModulePlacement[] = [
  { key: 'key_partnerships', colStart: 1, colEnd: 3, rowStart: 1, rowEnd: 3 },
  { key: 'key_activities', colStart: 3, colEnd: 5, rowStart: 1, rowEnd: 2 },
  { key: 'key_resources', colStart: 3, colEnd: 5, rowStart: 2, rowEnd: 3 },
  { key: 'value_propositions', colStart: 5, colEnd: 7, rowStart: 1, rowEnd: 3 },
  { key: 'customer_relationships', colStart: 7, colEnd: 9, rowStart: 1, rowEnd: 2 },
  { key: 'channels', colStart: 7, colEnd: 9, rowStart: 2, rowEnd: 3 },
  { key: 'customer_segments', colStart: 9, colEnd: 11, rowStart: 1, rowEnd: 3 },
  { key: 'cost_structure', colStart: 1, colEnd: 6, rowStart: 3, rowEnd: 4 },
  { key: 'revenue_streams', colStart: 6, colEnd: 11, rowStart: 3, rowEnd: 4 },
] as const;

export const PLACEMENT_BY_KEY = Object.fromEntries(
  CANVAS_LAYOUT.map((p) => [p.key, p]),
) as Record<ModuleKey, ModulePlacement>;

/** Estilo de rejilla para desktop. En tablet/móvil el lienzo colapsa por CSS. */
export function gridStyle(key: ModuleKey): CSSProperties {
  const p = PLACEMENT_BY_KEY[key];
  return {
    gridColumn: `${p.colStart} / ${p.colEnd}`,
    gridRow: `${p.rowStart} / ${p.rowEnd}`,
  };
}

/** Límites de la posición relativa de un post-it dentro de su módulo. */
export const NOTE_POSITION_MIN = 0;
export const NOTE_POSITION_MAX = 1;

export function clampPosition(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(NOTE_POSITION_MAX, Math.max(NOTE_POSITION_MIN, value));
}
