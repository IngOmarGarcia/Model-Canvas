import { requestAnalysisSchema } from '@/lib/validation/analysis';
import { AnalysisError, requestAnalysis } from '@/server/services/analysis.service';
import { getCurrentUser } from '@/server/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Solicita un análisis. Es un route handler y no una Server Action porque la
 * respuesta puede tardar decenas de segundos y conviene controlar el tiempo
 * límite y el código de estado (429 con Retry-After).
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'No autenticado.' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Cuerpo inválido.' }, { status: 400 });
  }

  const parsed = requestAnalysisSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Datos inválidos.' }, { status: 400 });
  }

  // Forzar un análisis nuevo (ignorando la caché) es exclusivo del facilitador.
  const force = parsed.data.force && user.role === 'facilitator';

  try {
    const analysis = await requestAnalysis(user, { ...parsed.data, force });
    return Response.json(analysis, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof AnalysisError) {
      return Response.json(
        { error: error.message },
        {
          status: error.status,
          headers: error.retryAfterSeconds
            ? { 'Retry-After': String(error.retryAfterSeconds) }
            : undefined,
        },
      );
    }

    console.error('[api/analysis]', error);
    return Response.json({ error: 'No se pudo generar el análisis.' }, { status: 500 });
  }
}