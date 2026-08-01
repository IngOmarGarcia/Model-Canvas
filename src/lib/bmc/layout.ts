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

/**
 * Alto relativo de cada fila. La inferior (costes e ingresos) es más baja, pero
 * lo justo para que quepan cabecera, descripción y un post-it.
 * Debe coincidir con grid-template-rows de .canvas-grid en globals.css.
 */
export const CANVAS_ROW_WEIGHTS = [1, 1, 0.72] as const;

/** Separación entre bloques, en píxeles de diseño (equivale a gap-2). */
export const CANVAS_GAP = 8;

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

/**
 * Rectángulo de un bloque en píxeles de diseño del tablero.
 *
 * En escritorio los bloques no se dibujan con CSS grid sino en posición
 * absoluta: es lo que permite redimensionarlos uno a uno sin que la rejilla
 * reacomode a los demás. La geometría base se deriva de CANVAS_LAYOUT, así que
 * sin ningún ajuste del usuario el resultado es idéntico a la rejilla.
 */
export interface BlockRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Ancho y alto mínimos de un bloque al redimensionarlo, en px de diseño. */
export const BLOCK_MIN_WIDTH = 168;
export const BLOCK_MIN_HEIGHT = 132;

/** Traduce la rejilla de 10 × 3 a rectángulos absolutos del tamaño indicado. */
export function canvasBaseRects(
  boardWidth: number,
  boardHeight: number,
  gap: number = CANVAS_GAP,
): Record<ModuleKey, BlockRect> {
  const columnWidth = (boardWidth - gap * (CANVAS_GRID_COLUMNS - 1)) / CANVAS_GRID_COLUMNS;
  const totalWeight = CANVAS_ROW_WEIGHTS.reduce((sum, weight) => sum + weight, 0);
  const rowSpace = boardHeight - gap * (CANVAS_GRID_ROWS - 1);
  const rowHeights = CANVAS_ROW_WEIGHTS.map((weight) => (weight / totalWeight) * rowSpace);

  // Coordenada y de cada fila, acumulando alturas y separaciones.
  const rowOffsets: number[] = [];
  let cursor = 0;
  for (const height of rowHeights) {
    rowOffsets.push(cursor);
    cursor += height + gap;
  }

  const entries = CANVAS_LAYOUT.map((p) => {
    const colSpan = p.colEnd - p.colStart;
    const rowSpan = p.rowEnd - p.rowStart;
    const rect: BlockRect = {
      x: (p.colStart - 1) * (columnWidth + gap),
      y: rowOffsets[p.rowStart - 1],
      width: colSpan * columnWidth + (colSpan - 1) * gap,
      height:
        rowHeights
          .slice(p.rowStart - 1, p.rowEnd - 1)
          .reduce((sum, height) => sum + height, 0) +
        (rowSpan - 1) * gap,
    };
    return [p.key, rect] as const;
  });

  return Object.fromEntries(entries) as Record<ModuleKey, BlockRect>;
}

/** Límites de la posición relativa de un post-it dentro de su módulo. */
export const NOTE_POSITION_MIN = 0;
export const NOTE_POSITION_MAX = 1;

export function clampPosition(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(NOTE_POSITION_MAX, Math.max(NOTE_POSITION_MIN, value));
}
