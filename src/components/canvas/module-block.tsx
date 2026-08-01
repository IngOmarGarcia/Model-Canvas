'use client';

import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { useCallback, useState } from 'react';

import { Icon } from '@/components/ui/icon';
import { gridStyle, type BlockRect } from '@/lib/bmc/layout';
import type { BmcModule } from '@/lib/bmc/modules';
import { cn } from '@/lib/utils';

import { useCanvasScale } from './canvas-context';
import { ModuleHelp } from './module-help';

/** Lados por los que se puede estirar un bloque. */
type ResizeEdge = 'e' | 's' | 'se';

/**
 * Un bloque del lienzo: número, nombre, icono, explicación breve, botón de
 * ayuda, contador de notas y área de post-its (zona soltable de dnd-kit).
 *
 * En escritorio recibe `rect` y se dibuja en posición absoluta, lo que permite
 * redimensionarlo por su borde derecho, el inferior o la esquina. Sin `rect`
 * (tablet y móvil) fluye dentro de .canvas-grid como hasta ahora.
 */
export function ModuleBlock({
  module: m,
  rect,
  noteCount,
  editable,
  active,
  presentation,
  resizable = false,
  raised = false,
  onAdd,
  onActivate,
  onResize,
  children,
}: {
  module: BmcModule;
  rect?: BlockRect;
  noteCount: number;
  editable: boolean;
  active: boolean;
  presentation?: boolean;
  resizable?: boolean;
  /** Tiene tamaño ajustado a mano: se dibuja por encima de sus vecinos. */
  raised?: boolean;
  onAdd: () => void;
  onActivate: () => void;
  onResize?: (width: number, height: number) => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: m.key });
  const placement = gridStyle(m.key);
  const scale = useCanvasScale();
  const [resizing, setResizing] = useState(false);

  const startResize = useCallback(
    (edge: ResizeEdge) => (event: React.PointerEvent<HTMLElement>) => {
      if (!rect || !onResize) return;

      // El gesto no debe llegar al lienzo (que panearía) ni activar el módulo.
      event.preventDefault();
      event.stopPropagation();

      const handle = event.currentTarget;
      const pointerId = event.pointerId;
      const start = { x: event.clientX, y: event.clientY, width: rect.width, height: rect.height };
      handle.setPointerCapture(pointerId);
      setResizing(true);

      // El puntero se mueve en píxeles de pantalla; el tablero está escalado.
      const onMove = (moveEvent: PointerEvent) => {
        const dx = (moveEvent.clientX - start.x) / scale;
        const dy = (moveEvent.clientY - start.y) / scale;
        onResize(
          edge === 's' ? start.width : start.width + dx,
          edge === 'e' ? start.height : start.height + dy,
        );
      };

      const onEnd = () => {
        handle.removeEventListener('pointermove', onMove);
        handle.removeEventListener('pointerup', onEnd);
        handle.removeEventListener('pointercancel', onEnd);
        if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
        setResizing(false);
      };

      handle.addEventListener('pointermove', onMove);
      handle.addEventListener('pointerup', onEnd);
      handle.addEventListener('pointercancel', onEnd);
    },
    [onResize, rect, scale],
  );

  return (
    <section
      // Sin rect, las variables las consume .canvas-grid y el bloque fluye en
      // columna por debajo de lg. Con rect manda la posición absoluta.
      style={
        rect
          ? {
              position: 'absolute',
              left: rect.x,
              top: rect.y,
              width: rect.width,
              height: rect.height,
              // Los bloques sin ajustar se quedan en z-index auto: así no
              // crean contexto de apilamiento y sus notas, con z-index muy
              // alto, siguen viéndose por encima de todo al arrastrarlas.
              zIndex: resizing ? 30 : raised ? 20 : undefined,
            }
          : ({
              '--gc': placement.gridColumn,
              '--gr': placement.gridRow,
            } as React.CSSProperties)
      }
      data-canvas-block={m.key}
      aria-label={`${m.order}. ${m.name}`}
      onPointerDown={onActivate}
      className={cn(
        'bg-surface relative flex min-w-0 flex-col rounded-lg border border-[var(--module-border)] p-2.5',
        active && !presentation && 'border-primary/60',
        resizing && 'border-primary shadow-lg',
      )}
    >
      <header className="flex shrink-0 items-start gap-1.5">
        <span className="bg-[var(--module-header)] text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded text-xs font-semibold">
          {m.order}
        </span>
        <Icon name={m.icon} className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        <h3
          className={cn(
            'min-w-0 flex-1 leading-tight font-semibold',
            presentation ? 'text-base' : 'text-sm',
          )}
        >
          {m.name}
        </h3>

        {!presentation && <ModuleHelp module={m} />}

        <span
          className="text-muted-foreground shrink-0 text-xs tabular-nums"
          title="Notas en este módulo"
        >
          {noteCount}
        </span>

        {editable && !presentation && (
          <button
            type="button"
            onClick={onAdd}
            className="hover:bg-muted rounded p-0.5"
            aria-label={`Agregar nota en ${m.name}`}
          >
            <Plus className="size-4" />
          </button>
        )}
      </header>

      {/* shrink-0 es imprescindible: line-clamp implica overflow:hidden, así
          que sin él este párrafo es el único hijo flexible que puede encogerse
          y en los bloques bajos (5 y 9) se colapsaba a altura cero. */}
      {!presentation && (
        <p className="text-muted-foreground mt-1.5 line-clamp-2 shrink-0 text-xs leading-snug">
          {m.description}
        </p>
      )}

      <div
        ref={setNodeRef}
        className={cn(
          'relative mt-2 flex-1 rounded transition-colors',
          // Con alto propio el bloque ya reserva sitio; en la rejilla fluida
          // hace falta un mínimo para que la zona soltable exista.
          rect ? 'min-h-0' : 'min-h-32',
          isOver && 'bg-accent/10 ring-accent/40 ring-2',
        )}
      >
        {noteCount === 0 && !isOver && (
          <span className="text-muted-foreground/50 pointer-events-none absolute inset-0 flex items-center justify-center text-center text-[11px]">
            {editable ? 'Sin notas todavía' : 'Sin notas'}
          </span>
        )}
        {children}
      </div>

      {resizable && rect && onResize && (
        <>
          <span
            role="separator"
            aria-label={`Ajustar el ancho de ${m.name}`}
            onPointerDown={startResize('e')}
            className="hover:bg-primary/30 absolute inset-y-3 -right-1 w-2 cursor-ew-resize touch-none rounded-full transition-colors"
          />
          <span
            role="separator"
            aria-label={`Ajustar el alto de ${m.name}`}
            onPointerDown={startResize('s')}
            className="hover:bg-primary/30 absolute inset-x-3 -bottom-1 h-2 cursor-ns-resize touch-none rounded-full transition-colors"
          />
          <span
            role="separator"
            aria-label={`Ajustar el tamaño de ${m.name}`}
            onPointerDown={startResize('se')}
            title="Arrastra para cambiar el tamaño"
            className={cn(
              'absolute right-0.5 bottom-0.5 size-3 cursor-nwse-resize touch-none rounded-[3px]',
              'border-r-2 border-b-2 border-[var(--module-border)] transition-colors',
              'hover:border-primary',
              resizing && 'border-primary',
            )}
          />
        </>
      )}
    </section>
  );
}
