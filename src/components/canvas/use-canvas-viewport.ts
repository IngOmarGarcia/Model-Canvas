'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 2.5;
/** Factor multiplicativo por pulsación de los botones y atajos de zoom. */
export const ZOOM_STEP = 1.2;

/** Píxeles del lienzo que siempre quedan dentro de la vista al desplazar. */
const PAN_MARGIN = 120;
/** Alto de una "línea" de rueda cuando el navegador informa deltaMode = 1. */
const LINE_HEIGHT = 16;

export interface Viewport {
  zoom: number;
  /** Desplazamiento del contenido dentro de la vista, en píxeles de pantalla. */
  x: number;
  y: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Marca los elementos que capturan el puntero (bloques y notas), no el fondo. */
export const BLOCK_ATTRIBUTE = 'data-canvas-block';

interface Options {
  /** Sólo hay zoom y paneo en la vista de escritorio; abajo el lienzo fluye. */
  enabled: boolean;
  /** Tamaño del contenido en píxeles de diseño (sin escalar). */
  contentWidth: number;
  contentHeight: number;
}

/**
 * Vista desplazable y ampliable del lienzo.
 *
 * El contenedor no usa scroll: el contenido se mueve con una única
 * transformación `translate(x, y) scale(zoom)`. Eso permite que el zoom
 * conserve el punto bajo el cursor (basta resolver x, y para que la coordenada
 * de mundo bajo el puntero no cambie) y que el desplazamiento sea libre en
 * ambos ejes, sin tener que llegar al final de la barra vertical.
 */
export function useCanvasViewport({ enabled, contentWidth, contentHeight }: Options) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<Viewport>({ zoom: 1, x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);

  // Los límites se consultan dentro de actualizaciones funcionales de estado,
  // fuera del render, así que se leen de una referencia siempre al día.
  const size = useRef({ contentWidth, contentHeight });
  useEffect(() => {
    size.current = { contentWidth, contentHeight };
  }, [contentWidth, contentHeight]);

  /** Impide perder el lienzo de vista: siempre queda un margen visible. */
  const constrain = useCallback((next: Viewport): Viewport => {
    const element = viewportRef.current;
    if (!element) return next;

    const { width: viewWidth, height: viewHeight } = element.getBoundingClientRect();
    const scaledWidth = size.current.contentWidth * next.zoom;
    const scaledHeight = size.current.contentHeight * next.zoom;
    const marginX = Math.min(PAN_MARGIN, scaledWidth);
    const marginY = Math.min(PAN_MARGIN, scaledHeight);

    return {
      zoom: next.zoom,
      x: clamp(next.x, marginX - scaledWidth, viewWidth - marginX),
      y: clamp(next.y, marginY - scaledHeight, viewHeight - marginY),
    };
  }, []);

  /**
   * Aplica un factor de zoom manteniendo fijo el punto indicado. Sin
   * coordenadas se usa el centro de la vista, que es lo que esperan los
   * botones de la barra y los atajos de teclado.
   */
  const zoomAt = useCallback(
    (factor: number, clientX?: number, clientY?: number) => {
      const element = viewportRef.current;
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const pointX = clientX === undefined ? rect.width / 2 : clientX - rect.left;
      const pointY = clientY === undefined ? rect.height / 2 : clientY - rect.top;

      setView((current) => {
        const zoom = clamp(current.zoom * factor, ZOOM_MIN, ZOOM_MAX);
        if (zoom === current.zoom) return current;

        // Coordenada de mundo bajo el puntero: debe seguir ahí tras el zoom.
        const worldX = (pointX - current.x) / current.zoom;
        const worldY = (pointY - current.y) / current.zoom;

        return constrain({ zoom, x: pointX - worldX * zoom, y: pointY - worldY * zoom });
      });
    },
    [constrain],
  );

  const panBy = useCallback(
    (dx: number, dy: number) => {
      setView((current) => constrain({ ...current, x: current.x + dx, y: current.y + dy }));
    },
    [constrain],
  );

  /** Encaja todo el lienzo en la vista y lo centra. */
  const fit = useCallback(() => {
    const element = viewportRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const { contentWidth: width, contentHeight: height } = size.current;
    if (width <= 0 || height <= 0) return;

    const zoom = clamp(Math.min(rect.width / width, rect.height / height), ZOOM_MIN, ZOOM_MAX);
    setView({
      zoom,
      x: (rect.width - width * zoom) / 2,
      y: (rect.height - height * zoom) / 2,
    });
  }, []);

  /** Vuelve al 100 % en la esquina de origen. */
  const reset = useCallback(() => setView({ zoom: 1, x: 0, y: 0 }), []);

  // Rueda: Ctrl/Cmd (o pellizco del trackpad) amplía sobre el cursor; sin
  // modificador desplaza en los dos ejes. Necesita listener no pasivo para
  // poder cancelar el scroll de la página.
  useEffect(() => {
    const element = viewportRef.current;
    if (!element || !enabled) return;

    function onWheel(event: WheelEvent) {
      event.preventDefault();

      const factor = event.deltaMode === 1 ? LINE_HEIGHT : 1;
      const deltaX = event.deltaX * factor;
      const deltaY = event.deltaY * factor;

      if (event.ctrlKey || event.metaKey) {
        zoomAt(Math.exp(-deltaY * 0.002), event.clientX, event.clientY);
        return;
      }

      // Shift+rueda es el gesto habitual para desplazarse en horizontal en
      // ratones de una sola rueda.
      if (event.shiftKey && deltaX === 0) panBy(-deltaY, 0);
      else panBy(-deltaX, -deltaY);
    }

    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [enabled, panBy, zoomAt]);

  // Espacio mantenido = modo mano, como en las herramientas de diseño.
  useEffect(() => {
    if (!enabled) return;

    // Dentro de un bloque el Espacio ya significa algo: activa botones y, sobre
    // el asidero de una nota, inicia el arrastre por teclado de dnd-kit.
    const isBusy = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(target.tagName) ||
        target.isContentEditable ||
        Boolean(target.closest(`[${BLOCK_ATTRIBUTE}]`)));

    function onKeyDown(event: KeyboardEvent) {
      if (event.code !== 'Space' || event.repeat || isBusy(event.target)) return;
      event.preventDefault();
      setSpaceHeld(true);
    }

    function onKeyUp(event: KeyboardEvent) {
      if (event.code === 'Space') setSpaceHeld(false);
    }

    const release = () => setSpaceHeld(false);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', release);
    };
  }, [enabled]);

  const origin = useRef<{ pointerId: number; x: number; y: number } | null>(null);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!enabled) return;

      const middle = event.button === 1;
      if (!middle && event.button !== 0) return;

      // Con el botón principal sólo se panea desde el fondo del lienzo, para no
      // robarle el gesto a las notas ni a los controladores de tamaño.
      const target = event.target as HTMLElement | null;
      const onBackground = !target?.closest(`[${BLOCK_ATTRIBUTE}]`);
      if (!middle && !spaceHeld && !onBackground) return;

      // El botón central abriría el autoscroll del navegador; el espacio, un
      // clic sobre el elemento que hubiera debajo.
      if (middle || spaceHeld) event.preventDefault();

      event.currentTarget.setPointerCapture(event.pointerId);
      origin.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
      setPanning(true);
    },
    [enabled, spaceHeld],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const start = origin.current;
      if (!start || start.pointerId !== event.pointerId) return;

      panBy(event.clientX - start.x, event.clientY - start.y);
      origin.current = { pointerId: start.pointerId, x: event.clientX, y: event.clientY };
    },
    [panBy],
  );

  const endPan = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (origin.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    origin.current = null;
    setPanning(false);
  }, []);

  return {
    viewportRef,
    view,
    panning,
    spaceHeld,
    zoomAt,
    zoomIn: useCallback(() => zoomAt(ZOOM_STEP), [zoomAt]),
    zoomOut: useCallback(() => zoomAt(1 / ZOOM_STEP), [zoomAt]),
    fit,
    reset,
    /** Se reparten sobre el contenedor de la vista. */
    viewportProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endPan,
      onPointerCancel: endPan,
    },
  };
}
