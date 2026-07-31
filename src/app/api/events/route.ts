import { EVENTS_PAGE_SIZE, listEventsSince } from '@/server/services/events.service';
import { assertOwnsSession } from '@/server/services/participants.service';
import { getCurrentUser } from '@/server/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Respaldo por polling incremental del canal SSE (docs/07).
 * Mismo formato de evento y mismo cursor: el cliente puede cambiar de
 * transporte sin perder ni repetir nada.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response('No autenticado', { status: 401 });

  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');
  if (!sessionId) return Response.json({ error: 'Falta sessionId' }, { status: 400 });

  try {
    await assertOwnsSession(user, sessionId);
  } catch {
    return new Response('No encontrado', { status: 404 });
  }

  let since = Number(url.searchParams.get('since') ?? 0);
  if (!Number.isFinite(since) || since < 0) since = 0;

  const events = await listEventsSince(sessionId, since, EVENTS_PAGE_SIZE);
  const cursor = events.length > 0 ? events[events.length - 1].id : since;

  return Response.json(
    { events, cursor },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
