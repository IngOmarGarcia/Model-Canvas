'use client';

import { useDraggable } from '@dnd-kit/core';
import { Check, GripHorizontal, Palette, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { NOTE_COLORS, type NoteColor } from '@/lib/colors';
import { NOTE_TEXT_MAX } from '@/lib/validation/notes';
import type { NoteDto } from '@/server/services/canvas.service';
import { cn } from '@/lib/utils';

import { useCanvasScale } from './canvas-context';

export const NOTE_WIDTH = 152;
export const NOTE_MIN_HEIGHT = 96;

export function StickyNote({
  note,
  editable,
  selected,
  presentation,
  onSelect,
  onChangeText,
  onChangeColor,
  onDelete,
}: {
  note: NoteDto;
  editable: boolean;
  selected: boolean;
  /** En modo presentación se quita la rotación y la sombra por nitidez. */
  presentation?: boolean;
  onSelect: () => void;
  onChangeText: (text: string) => void;
  onChangeColor: (color: NoteColor) => void;
  onDelete: () => void;
}) {
  const scale = useCanvasScale();
  const [editing, setEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: note.id,
    disabled: !editable || editing,
    data: { moduleKey: note.moduleKey },
  });

  useEffect(() => {
    if (editing) {
      const el = textareaRef.current;
      el?.focus();
      el?.setSelectionRange(el.value.length, el.value.length);
    }
  }, [editing]);

  // Inclinación estable derivada del id: aspecto de papel sin saltos al re-renderizar.
  const tilt = presentation ? 0 : (hashCode(note.id) % 30) / 10 - 1.5;

  const dragTransform = transform
    ? `translate3d(${transform.x / scale}px, ${transform.y / scale}px, 0)`
    : '';

  return (
    <div
      ref={setNodeRef}
      style={{
        left: `${note.x * 100}%`,
        top: `${note.y * 100}%`,
        width: NOTE_WIDTH,
        minHeight: NOTE_MIN_HEIGHT,
        zIndex: isDragging ? 999 : note.order,
        transform: `${dragTransform} rotate(${tilt}deg)`,
        background: `var(--note-${note.color})`,
        color: `var(--note-${note.color}-fg)`,
      }}
      className={cn(
        'absolute flex flex-col rounded-sm',
        !presentation && 'note-paper',
        isDragging && 'opacity-80',
        selected && 'ring-ring ring-2 ring-offset-1',
      )}
      onPointerDown={onSelect}
      onDoubleClick={() => editable && setEditing(true)}
    >
      {/* Cabecera de arrastre: toda la franja superior es el asidero. Se oculta
          al editar para no robarle alto al textarea. */}
      {editable && !editing && (
        <div
          {...listeners}
          {...attributes}
          aria-label="Mover nota"
          onDoubleClick={(event) => event.stopPropagation()}
          className="flex h-5 shrink-0 cursor-grab touch-none items-center justify-center rounded-t-sm opacity-40 transition-opacity hover:opacity-90 active:cursor-grabbing"
        >
          <GripHorizontal className="size-3.5" />
        </div>
      )}

      {editing ? (
        <textarea
          ref={textareaRef}
          value={note.text}
          maxLength={NOTE_TEXT_MAX}
          onChange={(event) => onChangeText(event.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              setEditing(false);
            }
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
              setEditing(false);
            }
          }}
          className="min-h-24 flex-1 resize-none bg-transparent p-2 text-sm leading-snug outline-none"
          placeholder="Escribe aquí…"
        />
      ) : (
        <button
          type="button"
          onClick={() => editable && setEditing(true)}
          className="flex-1 cursor-text p-2 text-left text-sm leading-snug break-words whitespace-pre-wrap"
        >
          {note.text || (
            <span className="opacity-50">{editable ? 'Toca para escribir' : 'Sin texto'}</span>
          )}
        </button>
      )}

      {editable && (
        <div className="flex items-center gap-0.5 px-1 pb-1 opacity-70 transition-opacity hover:opacity-100">
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="rounded p-1" aria-label="Cambiar color">
                <Palette className="size-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto" align="start">
              <div className="flex gap-1.5">
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    title={`${c.label} · ${c.uso}`}
                    aria-label={c.label}
                    onClick={() => onChangeColor(c.key)}
                    style={{ background: `var(--note-${c.key})` }}
                    className="border-border/60 flex size-7 items-center justify-center rounded border"
                  >
                    {note.color === c.key && <Check className="size-3.5 text-black/70" />}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <button
            type="button"
            onClick={onDelete}
            className="ml-auto rounded p-1"
            aria-label="Eliminar nota"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function hashCode(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
