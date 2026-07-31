'use client';

import { useEffect, useRef, useState } from 'react';

import type { LiveEvent } from '@/server/services/events.service';

export type LiveStatus = 'live' | 'polling' | 'reconnecting' | 'offline';

/** Intervalos del respaldo por polling, según haya o no actividad reciente. */
const POLL_ACTIVE_MS = 5000;
const POLL_IDLE_MS = 15_000;
/** Fallos seguidos de SSE antes de bajar a polling. */
const SSE_FAILURES_BEFORE_FALLBACK = 2;

/**
 * Suscripción a los eventos de la capacitación.
 *
 * Prefiere SSE; si el navegador o la red lo rompen, cae a polling incremental
 * con el mismo cursor, de modo que no se pierden ni se repiten eventos.
 * Ver docs/07-tiempo-real.md.
 */
export function useLiveEvents(
  trainingSessionId: string | null,
  initialCursor: number,
  onEvents: (events: LiveEvent[]) => void,
) {
  const [status, setStatus] = useState<LiveStatus>('reconnecting');
  const cursor = useRef(initialCursor);
  const handler = useRef(onEvents);
  const lastEventAt = useRef(Date.now());

  useEffect(() => {
    handler.current = onEvents;
  }, [onEvents]);

  useEffect(() => {
    if (!trainingSessionId) return;

    let disposed = false;
    let source: EventSource | null = null;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;

    const deliver = (events: LiveEvent[]) => {
      if (events.length === 0) return;
      cursor.current = events[events.length - 1].id;
      lastEventAt.current = Date.now();
      handler.current(events);
    };

    // ---- Respaldo: polling incremental --------------------------------------
    const poll = async () => {
      if (disposed) return;

      // Con la pestaña oculta no se consulta; al volver se recupera de una vez.
      if (document.hidden) {
        pollTimer = setTimeout(() => void poll(), POLL_IDLE_MS);
        return;
      }

      try {
        const response = await fetch(
          `/api/events?sessionId=${trainingSessionId}&since=${cursor.current}`,
          { cache: 'no-store' },
        );

        if (!response.ok) throw new Error(String(response.status));

        const data = (await response.json()) as { events: LiveEvent[]; cursor: number };
        deliver(data.events);
        if (!disposed) setStatus('polling');
      } catch {
        if (!disposed) setStatus('offline');
      }

      if (disposed) return;
      const quiet = Date.now() - lastEventAt.current > 60_000;
      pollTimer = setTimeout(() => void poll(), quiet ? POLL_IDLE_MS : POLL_ACTIVE_MS);
    };

    const startPolling = () => {
      source?.close();
      source = null;
      if (disposed) return;
      setStatus('polling');
      void poll();
    };

    // ---- Preferido: SSE ------------------------------------------------------
    const startSse = () => {
      if (disposed) return;

      if (typeof EventSource === 'undefined') {
        startPolling();
        return;
      }

      source = new EventSource(
        `/api/stream/session/${trainingSessionId}?since=${cursor.current}`,
      );

      source.onopen = () => {
        failures = 0;
        if (!disposed) setStatus('live');
      };

      source.addEventListener('activity', (event) => {
        try {
          deliver([JSON.parse((event as MessageEvent).data) as LiveEvent]);
        } catch {
          // Un mensaje ilegible no debe tirar la suscripción.
        }
      });

      source.onerror = () => {
        failures += 1;
        if (!disposed) setStatus('reconnecting');

        // EventSource reintenta solo; tras varios fallos se cambia de transporte.
        if (failures >= SSE_FAILURES_BEFORE_FALLBACK) startPolling();
      };
    };

    startSse();

    return () => {
      disposed = true;
      source?.close();
      clearTimeout(pollTimer);
    };
  }, [trainingSessionId]);

  return { status, cursor };
}
