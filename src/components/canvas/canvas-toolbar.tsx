'use client';

import {
  AlertCircle,
  Check,
  Loader2,
  Maximize,
  Minimize,
  Minus,
  Plus,
  Scan,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { NOTE_COLORS, type NoteColor } from '@/lib/colors';
import { tiempoRelativo } from '@/lib/utils';

import type { SaveStatus } from './use-canvas-notes';

export function CanvasToolbar({
  editable,
  status,
  savedAt,
  zoom,
  fullscreen,
  defaultColor,
  onZoomIn,
  onZoomOut,
  onFit,
  onToggleFullscreen,
  onDefaultColorChange,
}: {
  editable: boolean;
  status: SaveStatus;
  savedAt: Date | null;
  zoom: number;
  fullscreen: boolean;
  defaultColor: NoteColor;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onToggleFullscreen: () => void;
  onDefaultColorChange: (color: NoteColor) => void;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {editable && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <span
                className="border-border/60 size-4 rounded border"
                style={{ background: `var(--note-${defaultColor})` }}
              />
              Color
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto">
            <p className="text-muted-foreground mb-2 text-xs">Color de las notas nuevas</p>
            <div className="flex gap-1.5">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  title={`${c.label} · ${c.uso}`}
                  aria-label={c.label}
                  onClick={() => onDefaultColorChange(c.key)}
                  style={{ background: `var(--note-${c.key})` }}
                  className="border-border/60 flex size-7 items-center justify-center rounded border"
                >
                  {defaultColor === c.key && <Check className="size-3.5 text-black/70" />}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* El zoom solo tiene sentido en la rejilla de escritorio. */}
      <div className="hidden items-center gap-1 lg:flex">
        <Button variant="outline" size="icon-sm" onClick={onZoomOut} aria-label="Alejar">
          <Minus className="size-4" />
        </Button>
        <span className="text-muted-foreground w-12 text-center text-xs tabular-nums">
          {Math.round(zoom * 100)} %
        </span>
        <Button variant="outline" size="icon-sm" onClick={onZoomIn} aria-label="Acercar">
          <Plus className="size-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={onFit}>
          <Scan className="size-4" />
          Ajustar
        </Button>
      </div>

      <Button variant="outline" size="sm" onClick={onToggleFullscreen}>
        {fullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
        {fullscreen ? 'Salir' : 'Pantalla completa'}
      </Button>

      {editable && <SaveIndicator status={status} savedAt={savedAt} />}
    </div>
  );
}

function SaveIndicator({ status, savedAt }: { status: SaveStatus; savedAt: Date | null }) {
  // Refresca el "hace N s" sin depender de nuevos guardados.
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  if (status === 'saving') {
    return (
      <span className="text-muted-foreground ml-auto flex items-center gap-1.5 text-xs">
        <Loader2 className="size-3.5 animate-spin" />
        Guardando…
      </span>
    );
  }

  if (status === 'error') {
    return (
      <span className="text-destructive ml-auto flex items-center gap-1.5 text-xs">
        <AlertCircle className="size-3.5" />
        No se pudo guardar
      </span>
    );
  }

  if (status === 'saved' && savedAt) {
    return (
      <span className="text-muted-foreground ml-auto flex items-center gap-1.5 text-xs">
        <Check className="size-3.5" />
        Guardado {tiempoRelativo(savedAt)}
      </span>
    );
  }

  return <span className="text-muted-foreground ml-auto text-xs">Guardado automático</span>;
}
