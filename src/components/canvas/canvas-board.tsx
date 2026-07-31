'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { MODULES_IN_ORDER, type ModuleKey } from '@/lib/bmc/modules';
import { DEFAULT_NOTE_COLOR, type NoteColor } from '@/lib/colors';
import { cn } from '@/lib/utils';
import type { NoteDto } from '@/server/services/canvas.service';

import { CanvasScaleContext } from './canvas-context';
import { CanvasToolbar } from './canvas-toolbar';
import { ModuleBlock } from './module-block';
import { StickyNote } from './sticky-note';
import { useCanvasNotes } from './use-canvas-notes';

/** Alto de diseño del lienzo de escritorio; el ancho se ajusta al contenedor. */
const BOARD_HEIGHT = 820;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.1;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function CanvasBoard({
  canvasId,
  initialNotes,
  editable,
  presentation = false,
  className,
}: {
  canvasId: string;
  initialNotes: NoteDto[];
  /** false para el modo lectura del facilitador y el modo presentación. */
  editable: boolean;
  presentation?: boolean;
  className?: string;
}) {
  const { notes, status, savedAt, create, updateText, updateColor, move, remove } = useCanvasNotes(
    canvasId,
    initialNotes,
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [contentWidth, setContentWidth] = useState(0);
  const [defaultColor, setDefaultColor] = useState<NoteColor>(DEFAULT_NOTE_COLOR);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<ModuleKey>('customer_segments');

  const sensors = useSensors(
    // Un umbral pequeño evita que un clic para editar se interprete como arrastre.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  const notesByModule = useMemo(() => {
    const map = new Map<ModuleKey, NoteDto[]>();
    for (const note of notes) {
      const bucket = map.get(note.moduleKey);
      if (bucket) bucket.push(note);
      else map.set(note.moduleKey, [note]);
    }
    return map;
  }, [notes]);

  // El primer render del cliente asume escritorio para coincidir con el del
  // servidor; la corrección llega en el efecto, sin desajuste de hidratación.
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const apply = () => setIsDesktop(query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(() => {
      const styles = getComputedStyle(element);
      const padding = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
      setContentWidth(element.clientWidth - padding);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void containerRef.current?.requestFullscreen();
    }
  }, []);

  const addNote = useCallback(
    (moduleKey: ModuleKey) => {
      const count = notesByModule.get(moduleKey)?.length ?? 0;
      // Escalonado para que las notas nuevas no queden una encima de otra.
      const x = clamp(0.04 + (count % 3) * 0.3, 0, 0.7);
      const y = clamp(0.04 + Math.floor(count / 3) * 0.26, 0, 0.75);
      const id = create(moduleKey, x, y, defaultColor);
      setSelectedNote(id);
    },
    [create, defaultColor, notesByModule],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const moduleKey = over.id as ModuleKey;
      const dragged = active.rect.current.translated;
      if (!dragged) return;

      const target = over.rect;
      if (target.width === 0 || target.height === 0) return;

      // Ambos rectángulos están en coordenadas de pantalla, así que la fracción
      // resultante es independiente del zoom aplicado al contenedor.
      const maxX = Math.max(0, 1 - dragged.width / target.width);
      const maxY = Math.max(0, 1 - dragged.height / target.height);

      const x = clamp((dragged.left - target.left) / target.width, 0, maxX);
      const y = clamp((dragged.top - target.top) / target.height, 0, maxY);

      move(String(active.id), moduleKey, x, y);
    },
    [move],
  );

  // Atajos de teclado. Se ignoran mientras se escribe en un campo.
  useEffect(() => {
    if (!editable) return;

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;

      if (event.key === 'n' || event.key === 'N') {
        event.preventDefault();
        addNote(activeModule);
        return;
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNote) {
        event.preventDefault();
        remove(selectedNote);
        setSelectedNote(null);
        return;
      }

      if (event.key === 'Escape') {
        setSelectedNote(null);
        return;
      }

      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault();
        toggleFullscreen();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && (event.key === '+' || event.key === '=')) {
        event.preventDefault();
        setZoom((z) => clamp(z + ZOOM_STEP, ZOOM_MIN, ZOOM_MAX));
      }

      if ((event.ctrlKey || event.metaKey) && event.key === '-') {
        event.preventDefault();
        setZoom((z) => clamp(z - ZOOM_STEP, ZOOM_MIN, ZOOM_MAX));
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeModule, addNote, editable, remove, selectedNote, toggleFullscreen]);

  const scaled = isDesktop && contentWidth > 0;

  return (
    <div className={className}>
      <CanvasToolbar
        editable={editable}
        status={status}
        savedAt={savedAt}
        zoom={zoom}
        fullscreen={fullscreen}
        defaultColor={defaultColor}
        onZoomIn={() => setZoom((z) => clamp(z + ZOOM_STEP, ZOOM_MIN, ZOOM_MAX))}
        onZoomOut={() => setZoom((z) => clamp(z - ZOOM_STEP, ZOOM_MIN, ZOOM_MAX))}
        onFit={() => setZoom(1)}
        onToggleFullscreen={toggleFullscreen}
        onDefaultColorChange={setDefaultColor}
      />

      <div
        ref={containerRef}
        className={cn(
          'bg-canvas border-border overflow-auto rounded-xl border p-2 sm:p-3',
          fullscreen && 'h-dvh rounded-none border-0',
        )}
      >
        <CanvasScaleContext.Provider value={scaled ? zoom : 1}>
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div
              style={
                scaled
                  ? { width: contentWidth * zoom, height: BOARD_HEIGHT * zoom }
                  : undefined
              }
            >
              <div
                className="canvas-grid gap-2"
                style={
                  scaled
                    ? {
                        width: contentWidth,
                        height: BOARD_HEIGHT,
                        transform: `scale(${zoom})`,
                        transformOrigin: 'top left',
                      }
                    : undefined
                }
              >
                {MODULES_IN_ORDER.map((m) => {
                  const moduleNotes = notesByModule.get(m.key) ?? [];
                  return (
                    <ModuleBlock
                      key={m.key}
                      module={m}
                      noteCount={moduleNotes.length}
                      editable={editable}
                      active={editable && activeModule === m.key}
                      presentation={presentation}
                      onAdd={() => addNote(m.key)}
                      onActivate={() => setActiveModule(m.key)}
                    >
                      {moduleNotes.map((note) => (
                        <StickyNote
                          key={note.id}
                          note={note}
                          editable={editable}
                          presentation={presentation}
                          selected={selectedNote === note.id}
                          onSelect={() => setSelectedNote(note.id)}
                          onChangeText={(text) => updateText(note.id, text)}
                          onChangeColor={(color) => updateColor(note.id, color)}
                          onDelete={() => {
                            remove(note.id);
                            setSelectedNote(null);
                          }}
                        />
                      ))}
                    </ModuleBlock>
                  );
                })}
              </div>
            </div>
          </DndContext>
        </CanvasScaleContext.Provider>
      </div>

      {editable && (
        <p className="text-muted-foreground mt-2 text-xs">
          Atajos: <kbd>N</kbd> nueva nota · <kbd>Supr</kbd> eliminar la seleccionada ·{' '}
          <kbd>Esc</kbd> deseleccionar · <kbd>F</kbd> pantalla completa ·{' '}
          <kbd>Ctrl</kbd>+<kbd>+</kbd>/<kbd>−</kbd> zoom
        </p>
      )}
    </div>
  );
}
