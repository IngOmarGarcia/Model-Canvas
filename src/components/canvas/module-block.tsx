'use client';

import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';

import { Icon } from '@/components/ui/icon';
import { gridStyle } from '@/lib/bmc/layout';
import type { BmcModule } from '@/lib/bmc/modules';
import { cn } from '@/lib/utils';

import { ModuleHelp } from './module-help';

/**
 * Un bloque del lienzo: número, nombre, icono, explicación breve, botón de
 * ayuda, contador de notas y área de post-its (zona soltable de dnd-kit).
 */
export function ModuleBlock({
  module: m,
  noteCount,
  editable,
  active,
  presentation,
  onAdd,
  onActivate,
  children,
}: {
  module: BmcModule;
  noteCount: number;
  editable: boolean;
  active: boolean;
  presentation?: boolean;
  onAdd: () => void;
  onActivate: () => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: m.key });
  const placement = gridStyle(m.key);

  return (
    <section
      // Las variables las consume .canvas-grid: en desktop colocan el bloque en
      // la rejilla tradicional; por debajo de lg se ignoran y fluye en columna.
      style={
        {
          '--gc': placement.gridColumn,
          '--gr': placement.gridRow,
        } as React.CSSProperties
      }
      aria-label={`${m.order}. ${m.name}`}
      onPointerDown={onActivate}
      className={cn(
        'bg-surface flex min-w-0 flex-col rounded-lg border border-[var(--module-border)] p-2.5',
        active && !presentation && 'border-primary/60',
      )}
    >
      <header className="flex items-start gap-1.5">
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

      {!presentation && (
        <p className="text-muted-foreground mt-1.5 line-clamp-2 text-xs leading-snug">
          {m.description}
        </p>
      )}

      <div
        ref={setNodeRef}
        className={cn(
          'relative mt-2 min-h-32 flex-1 rounded transition-colors',
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
    </section>
  );
}
