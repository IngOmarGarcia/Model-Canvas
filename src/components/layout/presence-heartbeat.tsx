'use client';

import { useEffect } from 'react';

import { heartbeatAction } from '@/server/actions/participants.actions';

const HEARTBEAT_MS = 60_000;

/**
 * Latido de presencia del participante. El servidor escribe `last_seen_at` como
 * mucho una vez por minuto, así que un latido perdido no tiene consecuencias.
 * Se pausa con la pestaña oculta y se reanuda al volver.
 */
export function PresenceHeartbeat() {
  useEffect(() => {
    const beat = () => {
      if (document.hidden) return;
      void heartbeatAction();
    };

    beat();
    const timer = setInterval(beat, HEARTBEAT_MS);
    document.addEventListener('visibilitychange', beat);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', beat);
    };
  }, []);

  return null;
}
