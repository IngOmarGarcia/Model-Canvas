import { listEventsSince } from '@/server/services/events.service';
import { assertOwnsSession } from '@/server/services/participants.service';
import { getCurrentUser } from '@/server/session';

// El pool de Postgres exige runtime Node; el flujo no puede cachearse.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const POLL_INTERVAL_MS = 1500;
const KEEP_ALIVE_MS = 20_000;

/**
 * Canal SSE de una capacitación (docs/07).
 *
 * El sondeo lo hace el servidor, no el navegador: una sola conexión por pestaña
 * en lugar de N peticiones. El id de `activity_events` actúa como cursor, así
 * que una reconexión con `Last-Event-ID` no pierde eventos.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;

  const user = await getCurrentUser();
  if (!user) return new Response('No autenticado', { status: 401 });

  // Se autoriza ANTES de abrir el flujo.
  try {
    await assertOwnsSession(user, sessionId);
  } catch {
    return new Response('No encontrado', { status: 404 });
  }

  const url = new URL(request.url);
  const lastEventId = request.headers.get('last-event-id');
  let cursor = Number(lastEventId ?? url.searchParams.get('since') ?? 0);
  if (!Number.isFinite(cursor) || cursor < 0) cursor = 0;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const timers: ReturnType<typeof setInterval>[] = [];

      const close = () => {
        if (closed) return;
        closed = true;
        for (const timer of timers) clearInterval(timer);
        try {
          controller.close();
        } catch {
          // Ya cerrado por el cliente.
        }
      };

      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          close();
        }
      };

      // Reconexión sugerida al cliente si se cae la conexión.
      send('retry: 3000\n\n');

      const tick = async () => {
        if (closed) return;
        try {
          const events = await listEventsSince(sessionId, cursor);
          for (const event of events) {
            cursor = event.id;
            send(`id: ${event.id}\nevent: activity\ndata: ${JSON.stringify(event)}\n\n`);
          }
        } catch (error) {
          console.error('[sse] error al leer eventos', error);
          close();
        }
      };

      await tick();

      timers.push(setInterval(() => void tick(), POLL_INTERVAL_MS));
      // Comentario SSE: mantiene viva la conexión a través de proxies.
      timers.push(setInterval(() => send(': keep-alive\n\n'), KEEP_ALIVE_MS));

      request.signal.addEventListener('abort', close);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
