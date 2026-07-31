'use client';

import { ChevronLeft, Maximize, Minimize, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { NoteDto } from '@/server/services/canvas.service';

import { CanvasBoard } from './canvas-board';

export interface PresentableCanvas {
  id: string;
  label: string;
  kind: 'facilitator' | 'participant' | 'consolidated';
}

/**
 * Modo presentación: sin barra lateral ni cabecera, pensado para proyector o
 * para compartir pantalla en Meet/Zoom. Los controles se ocultan tras unos
 * segundos de inactividad para no distraer.
 */
export function PresentationView({
  canvasId,
  notes,
  title,
  available,
}: {
  canvasId: string;
  notes: NoteDto[];
  title: string;
  available: PresentableCanvas[];
}) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const show = () => {
      setVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => setVisible(false), 3000);
    };

    show();
    window.addEventListener('pointermove', show);
    window.addEventListener('keydown', show);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointermove', show);
      window.removeEventListener('keydown', show);
    };
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  return (
    <div className="bg-background min-h-dvh p-3">
      <div
        className={cn(
          'fixed top-3 left-1/2 z-50 flex -translate-x-1/2 flex-wrap items-center gap-1.5 rounded-full border px-2 py-1.5 shadow-lg transition-opacity',
          'bg-surface/95 border-border backdrop-blur',
          visible ? 'opacity-100' : 'opacity-0',
        )}
      >
        <Button asChild size="icon-sm" variant="ghost" aria-label="Salir de la presentación">
          <Link href="/f/monitoreo">
            <ChevronLeft className="size-4" />
          </Link>
        </Button>

        <span className="max-w-40 truncate px-1 text-sm font-medium">{title}</span>

        {available.length > 1 && (
          <select
            value={canvasId}
            onChange={(event) => router.push(`/presentacion/${event.target.value}`)}
            aria-label="Elegir el lienzo que se proyecta"
            className="bg-surface border-border rounded-md border px-2 py-1 text-sm"
          >
            {available.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        )}

        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          onClick={() => {
            if (document.fullscreenElement) void document.exitFullscreen();
            else void document.documentElement.requestFullscreen();
          }}
        >
          {fullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
        </Button>

        <Button asChild size="icon-sm" variant="ghost" aria-label="Cerrar">
          <Link href="/f">
            <X className="size-4" />
          </Link>
        </Button>
      </div>

      <CanvasBoard
        key={canvasId}
        canvasId={canvasId}
        initialNotes={notes}
        editable={false}
        presentation
      />
    </div>
  );
}
