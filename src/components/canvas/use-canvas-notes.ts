'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import type { ModuleKey } from '@/lib/bmc/modules';
import type { NoteColor } from '@/lib/colors';
import type { NoteDto } from '@/server/services/canvas.service';
import {
  createNoteAction,
  deleteNoteAction,
  moveNoteAction,
  updateNoteColorAction,
  updateNoteTextAction,
} from '@/server/actions/notes.actions';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/** Espera tras la última tecla antes de persistir el texto (docs/07). */
const TEXT_DEBOUNCE_MS = 600;

const isTemp = (id: string) => id.startsWith('tmp-');

/**
 * Estado del lienzo con escritura optimista.
 *
 *  - El cambio se ve al instante; la red va detrás.
 *  - El texto se persiste con debounce; la posición solo al soltar.
 *  - Las peticiones de una misma nota se encadenan para conservar el orden.
 *  - Si el servidor rechaza, se revierte al último valor confirmado.
 */
export function useCanvasNotes(canvasId: string, initialNotes: NoteDto[]) {
  const [notes, setNotes] = useState<NoteDto[]>(initialNotes);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  /** Último valor confirmado por el servidor, para poder revertir. */
  const confirmed = useRef(new Map<string, NoteDto>(initialNotes.map((n) => [n.id, n])));
  /** Espejo del estado para leerlo dentro de tareas asíncronas sin re-renderizar. */
  const notesRef = useRef<NoteDto[]>(initialNotes);
  const inflight = useRef(0);
  const textTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const chains = useRef(new Map<string, Promise<unknown>>());
  const creating = useRef(new Map<string, Promise<string | null>>());

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    const timers = textTimers.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
    };
  }, []);

  const begin = useCallback(() => {
    inflight.current += 1;
    setStatus('saving');
  }, []);

  const end = useCallback((succeeded: boolean) => {
    inflight.current = Math.max(0, inflight.current - 1);
    if (!succeeded) {
      setStatus('error');
      return;
    }
    if (inflight.current === 0) {
      setStatus('saved');
      setSavedAt(new Date());
    }
  }, []);

  /** Serializa las peticiones de una misma nota: sin carreras entre cambios. */
  const enqueue = useCallback((id: string, task: () => Promise<void>) => {
    const previous = chains.current.get(id) ?? Promise.resolve();
    const next = previous.then(task, task);
    chains.current.set(id, next);
    return next;
  }, []);

  /** Una nota recién creada aún no tiene id real: se espera a que el servidor lo dé. */
  const resolveId = useCallback(async (id: string): Promise<string | null> => {
    if (!isTemp(id)) return id;
    return (await creating.current.get(id)) ?? null;
  }, []);

  const revert = useCallback((id: string) => {
    const snapshot = confirmed.current.get(id);
    setNotes((current) =>
      snapshot
        ? current.map((n) => (n.id === id ? snapshot : n))
        : current.filter((n) => n.id !== id),
    );
  }, []);

  const create = useCallback(
    (moduleKey: ModuleKey, x: number, y: number, color: NoteColor) => {
      const tempId = `tmp-${crypto.randomUUID()}`;

      setNotes((current) => [
        ...current,
        {
          id: tempId,
          moduleKey,
          text: '',
          color,
          x,
          y,
          order: current.reduce((max, n) => Math.max(max, n.order), 0) + 1,
        },
      ]);

      const request = (async () => {
        begin();
        const result = await createNoteAction({
          canvasId,
          moduleKey,
          text: '',
          color,
          positionX: x,
          positionY: y,
        });
        end(result.ok);

        if (!result.ok) {
          toast.error(result.error);
          setNotes((current) => current.filter((n) => n.id !== tempId));
          return null;
        }

        const saved = result.data;
        confirmed.current.set(saved.id, saved);
        // Se conserva el texto que el usuario haya escrito mientras iba la petición.
        setNotes((current) =>
          current.map((n) => (n.id === tempId ? { ...saved, text: n.text } : n)),
        );

        return saved.id;
      })();

      creating.current.set(tempId, request);
      return tempId;
    },
    [begin, canvasId, end],
  );

  const flushText = useCallback(
    (id: string) => {
      textTimers.current.delete(id);

      void enqueue(id, async () => {
        const realId = await resolveId(id);
        if (!realId) return;

        // El valor que se envía es siempre el último escrito.
        const text = notesRef.current.find((n) => n.id === id || n.id === realId)?.text ?? '';

        begin();
        const result = await updateNoteTextAction({ noteId: realId, text });
        end(result.ok);

        if (!result.ok) {
          toast.error(result.error);
          revert(realId);
          return;
        }

        const snapshot = confirmed.current.get(realId);
        if (snapshot) confirmed.current.set(realId, { ...snapshot, text });
      });
    },
    [begin, end, enqueue, resolveId, revert],
  );

  const updateText = useCallback(
    (id: string, text: string) => {
      setNotes((current) => current.map((n) => (n.id === id ? { ...n, text } : n)));

      const existing = textTimers.current.get(id);
      if (existing) clearTimeout(existing);
      textTimers.current.set(id, setTimeout(() => flushText(id), TEXT_DEBOUNCE_MS));
    },
    [flushText],
  );

  const updateColor = useCallback(
    (id: string, color: NoteColor) => {
      setNotes((current) => current.map((n) => (n.id === id ? { ...n, color } : n)));

      void enqueue(id, async () => {
        const realId = await resolveId(id);
        if (!realId) return;

        begin();
        const result = await updateNoteColorAction({ noteId: realId, color });
        end(result.ok);

        if (!result.ok) {
          toast.error(result.error);
          revert(realId);
          return;
        }

        const snapshot = confirmed.current.get(realId);
        if (snapshot) confirmed.current.set(realId, { ...snapshot, color });
      });
    },
    [begin, end, enqueue, resolveId, revert],
  );

  const move = useCallback(
    (id: string, moduleKey: ModuleKey, x: number, y: number) => {
      setNotes((current) => {
        const maxOrder = current.reduce((max, n) => Math.max(max, n.order), 0);
        return current.map((n) =>
          n.id === id ? { ...n, moduleKey, x, y, order: maxOrder + 1 } : n,
        );
      });

      void enqueue(id, async () => {
        const realId = await resolveId(id);
        if (!realId) return;

        begin();
        const result = await moveNoteAction({
          noteId: realId,
          moduleKey,
          positionX: x,
          positionY: y,
        });
        end(result.ok);

        if (!result.ok) {
          toast.error(result.error);
          revert(realId);
          return;
        }

        const snapshot = confirmed.current.get(realId);
        if (snapshot) confirmed.current.set(realId, { ...snapshot, moduleKey, x, y });
      });
    },
    [begin, end, enqueue, resolveId, revert],
  );

  const remove = useCallback(
    (id: string) => {
      const snapshot = notesRef.current.find((n) => n.id === id);
      setNotes((current) => current.filter((n) => n.id !== id));

      const timer = textTimers.current.get(id);
      if (timer) {
        clearTimeout(timer);
        textTimers.current.delete(id);
      }

      void enqueue(id, async () => {
        const realId = await resolveId(id);
        if (!realId) return;

        begin();
        const result = await deleteNoteAction({ noteId: realId });
        end(result.ok);

        if (!result.ok) {
          toast.error(result.error);
          if (snapshot) setNotes((current) => [...current, snapshot]);
          return;
        }

        confirmed.current.delete(realId);
      });
    },
    [begin, end, enqueue, resolveId],
  );

  return { notes, status, savedAt, create, updateText, updateColor, move, remove };
}
