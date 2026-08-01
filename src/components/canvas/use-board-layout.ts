'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  BLOCK_MIN_HEIGHT,
  BLOCK_MIN_WIDTH,
  canvasBaseRects,
  type BlockRect,
} from '@/lib/bmc/layout';
import { isModuleKey, type ModuleKey } from '@/lib/bmc/modules';

/** Tamaño ajustado por el usuario, en fracciones del tablero. */
interface StoredSize {
  width: number;
  height: number;
}

type StoredSizes = Partial<Record<ModuleKey, StoredSize>>;

const STORAGE_PREFIX = 'bmc:layout:';
/** Espera tras el último arrastre antes de escribir en localStorage. */
const PERSIST_DEBOUNCE_MS = 250;
/** Un bloque no puede crecer más allá de este múltiplo del tablero. */
const MAX_FACTOR = 1;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function read(canvasId: string): StoredSizes {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + canvasId);
    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};

    const sizes: StoredSizes = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!isModuleKey(key) || !value || typeof value !== 'object') continue;
      const { width, height } = value as Partial<StoredSize>;
      if (typeof width !== 'number' || typeof height !== 'number') continue;
      if (!Number.isFinite(width) || !Number.isFinite(height)) continue;
      sizes[key] = { width, height };
    }
    return sizes;
  } catch {
    // Almacenamiento bloqueado o contenido corrupto: se usa el diseño base.
    return {};
  }
}

/**
 * Geometría de los bloques del lienzo con tamaños ajustables.
 *
 * Los ajustes se guardan como fracción del tablero, no en píxeles, para que
 * sobrevivan a un cambio de ventana o de resolución. Son una preferencia de
 * visualización de cada navegador: no viajan al servidor ni afectan a las
 * notas, que se posicionan en porcentaje dentro de su módulo.
 */
export function useBoardLayout(canvasId: string, boardWidth: number, boardHeight: number) {
  const [sizes, setSizes] = useState<StoredSizes>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSizes(read(canvasId));
    setLoaded(true);
  }, [canvasId]);

  // Se escribe con retardo: durante el arrastre el tamaño cambia en cada
  // pixel y no hace falta persistir los estados intermedios.
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!loaded) return;

    if (pending.current) clearTimeout(pending.current);
    pending.current = setTimeout(() => {
      try {
        const key = STORAGE_PREFIX + canvasId;
        if (Object.keys(sizes).length === 0) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, JSON.stringify(sizes));
      } catch {
        // Sin almacenamiento el ajuste sigue vivo en memoria; no se avisa.
      }
    }, PERSIST_DEBOUNCE_MS);

    return () => {
      if (pending.current) clearTimeout(pending.current);
    };
  }, [canvasId, loaded, sizes]);

  const baseRects = useMemo(
    () => canvasBaseRects(boardWidth, boardHeight),
    [boardHeight, boardWidth],
  );

  const rects = useMemo(() => {
    const result = {} as Record<ModuleKey, BlockRect>;
    for (const [key, base] of Object.entries(baseRects) as [ModuleKey, BlockRect][]) {
      const stored = sizes[key];
      result[key] = stored
        ? {
            ...base,
            width: stored.width * boardWidth,
            height: stored.height * boardHeight,
          }
        : base;
    }
    return result;
  }, [baseRects, boardHeight, boardWidth, sizes]);

  /**
   * Extensión real del contenido. Un bloque agrandado puede salirse del
   * tablero base, y la vista debe poder alcanzarlo y encajarlo.
   */
  const extent = useMemo(() => {
    let width = boardWidth;
    let height = boardHeight;
    for (const rect of Object.values(rects) as BlockRect[]) {
      width = Math.max(width, rect.x + rect.width);
      height = Math.max(height, rect.y + rect.height);
    }
    return { width, height };
  }, [boardHeight, boardWidth, rects]);

  const resize = useCallback(
    (key: ModuleKey, width: number, height: number) => {
      if (boardWidth <= 0 || boardHeight <= 0) return;

      const base = baseRects[key];
      const maxWidth = boardWidth * (1 + MAX_FACTOR) - base.x;
      const maxHeight = boardHeight * (1 + MAX_FACTOR) - base.y;

      setSizes((current) => ({
        ...current,
        [key]: {
          width: clamp(width, BLOCK_MIN_WIDTH, maxWidth) / boardWidth,
          height: clamp(height, BLOCK_MIN_HEIGHT, maxHeight) / boardHeight,
        },
      }));
    },
    [baseRects, boardHeight, boardWidth],
  );

  const resetLayout = useCallback(() => setSizes({}), []);

  /**
   * Bloques con tamaño propio. Se dibujan por encima de los demás: al agrandar
   * uno, lo natural es que tape a sus vecinos y no al revés. Las notas que se
   * arrastran siguen ganando, porque llevan un z-index muy superior.
   */
  const custom = useMemo(() => new Set(Object.keys(sizes) as ModuleKey[]), [sizes]);

  return {
    rects,
    extent,
    resize,
    resetLayout,
    custom,
    /** Hay al menos un bloque con tamaño propio: habilita "Restablecer". */
    customized: custom.size > 0,
  };
}
