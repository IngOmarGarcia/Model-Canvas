import 'server-only';

import { and, asc, count, desc, eq, gte, isNull, sql } from 'drizzle-orm';

import { db } from '@/db';
import type { AnalysisScope, LlmProviderKey } from '@/db/schema/enums';
import type { AnalysisResult } from '@/db/schema/analyses';
import {
  activityEvents,
  canvasAnalyses,
  canvases,
  stickyNotes,
  trainingSessions,
} from '@/db/schema';
import type { ModuleKey } from '@/lib/bmc/modules';
import { canvasContentHash } from '@/lib/hash';
import { evaluateRateLimit } from '@/lib/rate-limit';
import { analysisResultSchema, extractJson } from '@/lib/validation/analysis';
import {
  createProvider,
  getFallbackProviderConfig,
  isRecoverableWithFallback,
  LlmError,
  type LlmConfigSource,
  type ProviderConfig,
} from '@/server/llm';
import {
  buildCanvasPrompt,
  buildSessionPrompt,
  type SerializableNote,
} from '@/server/llm/prompts';
import { buildSystemPrompt } from '@/server/llm/prompts';

import { getResolvedLlmRuntime } from './llm-settings.service';
import type { CurrentUser } from '../session';

export class AnalysisError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'AnalysisError';
  }
}

export interface AnalysisView {
  id: string;
  scope: AnalysisScope;
  result: AnalysisResult;
  score: number | null;
  createdAt: Date;
  model: string;
  provider: string;
  /** true si se reutilizó un análisis previo con el mismo contenido. */
  cached: boolean;
  truncated?: boolean;
}

/** El actor puede ver/analizar este lienzo: dueño, o facilitador de la sesión. */
async function resolveCanvasAccess(user: CurrentUser, canvasId: string) {
  const [row] = await db
    .select({
      canvasId: canvases.id,
      ownerId: canvases.ownerId,
      trainingSessionId: canvases.trainingSessionId,
      organizationId: trainingSessions.organizationId,
      facilitatorId: trainingSessions.facilitatorId,
    })
    .from(canvases)
    .innerJoin(trainingSessions, eq(trainingSessions.id, canvases.trainingSessionId))
    .where(eq(canvases.id, canvasId))
    .limit(1);

  if (!row || row.organizationId !== user.organizationId) {
    // 404 y no 403: no se confirma que el recurso exista (docs/03, regla 4).
    throw new AnalysisError('No encontrado.', 404);
  }

  const isOwner = row.ownerId === user.id;
  const isFacilitator = user.role === 'facilitator' && row.facilitatorId === user.id;

  if (!isOwner && !isFacilitator) throw new AnalysisError('No encontrado.', 404);

  return row;
}

async function listNotesForCanvas(canvasId: string): Promise<SerializableNote[]> {
  const rows = await db
    .select({ moduleKey: stickyNotes.moduleKey, text: stickyNotes.text })
    .from(stickyNotes)
    .where(eq(stickyNotes.canvasId, canvasId))
    .orderBy(asc(stickyNotes.orderIndex));

  return rows as { moduleKey: ModuleKey; text: string }[];
}

/** Ventana deslizante sobre canvas_analyses. La caché no consume cuota. */
async function enforceRateLimit(user: CurrentUser) {
  const hourAgo = new Date(Date.now() - 3_600_000);
  const dayAgo = new Date(Date.now() - 86_400_000);

  const [hourRow] = await db
    .select({
      total: count(),
      oldest: sql<Date | null>`min(${canvasAnalyses.createdAt})`,
    })
    .from(canvasAnalyses)
    .where(and(eq(canvasAnalyses.requestedBy, user.id), gte(canvasAnalyses.createdAt, hourAgo)));

  const [dayRow] = await db
    .select({ total: count() })
    .from(canvasAnalyses)
    .where(and(eq(canvasAnalyses.requestedBy, user.id), gte(canvasAnalyses.createdAt, dayAgo)));

  const verdict = evaluateRateLimit(
    user.role,
    hourRow?.total ?? 0,
    dayRow?.total ?? 0,
    hourRow?.oldest ? new Date(hourRow.oldest) : null,
  );

  if (!verdict.allowed) {
    throw new AnalysisError(verdict.message ?? 'Límite alcanzado.', 429, verdict.retryAfterSeconds);
  }
}

async function findCached(
  scope: AnalysisScope,
  canvasId: string | null,
  trainingSessionId: string,
  contentHash: string,
) {
  const [row] = await db
    .select()
    .from(canvasAnalyses)
    .where(
      and(
        eq(canvasAnalyses.scope, scope),
        canvasId ? eq(canvasAnalyses.canvasId, canvasId) : isNull(canvasAnalyses.canvasId),
        eq(canvasAnalyses.trainingSessionId, trainingSessionId),
        eq(canvasAnalyses.contentHash, contentHash),
        eq(canvasAnalyses.status, 'completed'),
      ),
    )
    .orderBy(desc(canvasAnalyses.createdAt))
    .limit(1);

  return row ?? null;
}

/** Un destino concreto al que llamar: proveedor + su configuración. */
interface LlmTarget {
  provider: LlmProviderKey;
  config: ProviderConfig;
}

/** Proveedor que de verdad atenderá la petición en este entorno. */
interface ActiveLlm extends LlmTarget {
  customInstructions: string;
  source: LlmConfigSource;
  /** Respaldo en la nube para cuando el Ollama local no responde. */
  fallback: LlmTarget | null;
}

/**
 * Configuración de la organización (Neon) ya adaptada al entorno de ejecución.
 *
 * Es aquí donde se traduce "Ollama en localhost" a algo utilizable: en
 * desarrollo, el servidor de la máquina; en Netlify, el proveedor de respaldo o
 * un 409 explicando por qué no se puede.
 */
async function resolveActiveLlm(user: CurrentUser): Promise<ActiveLlm> {
  const runtime = await getResolvedLlmRuntime(user);

  if (!runtime) {
    throw new AnalysisError('El facilitador aún no configuró el proveedor de IA.', 409);
  }
  if (!runtime.resolved.ok) {
    throw new AnalysisError(runtime.resolved.reason, 409);
  }

  const { provider, config, source } = runtime.resolved;

  // El reintento en caliente se reserva a Ollama: que el servidor local esté
  // apagado o sin el modelo descargado se salva con la nube, mientras que el
  // fallo de un proveedor de pago casi siempre es de configuración y taparlo
  // solo escondería el problema al facilitador.
  const candidate = provider === 'ollama' ? getFallbackProviderConfig(config.maxOutputTokens) : null;

  // Si el respaldo apunta al mismo sitio que ya falló, no hay nada que reintentar.
  const esOtroDestino =
    candidate && !(candidate.provider === provider && candidate.config.baseUrl === config.baseUrl);

  return {
    provider,
    config,
    source,
    customInstructions: runtime.customInstructions,
    fallback: esOtroDestino ? { provider: candidate.provider, config: candidate.config } : null,
  };
}

interface Generated {
  result: AnalysisResult;
  inputTokens: number | null;
  outputTokens: number | null;
  /** Quien respondió de verdad: puede ser el respaldo y no el proveedor previsto. */
  provider: LlmProviderKey;
  model: string;
}

/**
 * Una llamada completa a un proveedor: incluye el reintento único por formato
 * inválido. Los errores del propio proveedor (red, clave, cuota) se propagan sin
 * envolver, para que quien llama pueda decidir si prueba con el respaldo.
 */
async function callProvider(
  target: LlmTarget,
  customInstructions: string,
  prompt: string,
): Promise<Generated> {
  const provider = createProvider(target.provider, target.config);
  const system = buildSystemPrompt(customInstructions);

  const attempt = async (extra: string) => {
    const response = await provider.complete({
      system: system + extra,
      prompt,
      maxOutputTokens: target.config.maxOutputTokens,
    });
    const parsed = analysisResultSchema.parse(extractJson(response.raw));
    return {
      result: parsed,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      provider: target.provider,
      model: target.config.model,
    } satisfies Generated;
  };

  try {
    return await attempt('');
  } catch (error) {
    // Repetir el prompt no arregla un fallo del proveedor: solo un JSON inválido.
    if (error instanceof LlmError) throw error;

    try {
      return await attempt(
        '\n\nIMPORTANTE: tu respuesta anterior no era JSON válido según el esquema. Devuelve SOLO el objeto JSON, sin ningún texto adicional.',
      );
    } catch (retryError) {
      if (retryError instanceof LlmError) throw retryError;
      throw new AnalysisError('El modelo devolvió una respuesta que no se pudo interpretar.', 502);
    }
  }
}

/**
 * Genera el análisis con el proveedor activo y, si el local resulta inalcanzable,
 * reintenta UNA vez con el respaldo en la nube.
 *
 * Solo se reintenta ante fallos de conectividad o modelo inexistente: una clave
 * rechazada o una cuota agotada se propagan tal cual, porque repetirlas contra
 * otro proveedor no las arregla y ocultaría el motivo real.
 */
async function generate(settings: ActiveLlm, prompt: string): Promise<Generated> {
  try {
    return await callProvider(settings, settings.customInstructions, prompt);
  } catch (error) {
    if (settings.fallback && isRecoverableWithFallback(error)) {
      console.warn(
        `[analysis] ${settings.provider} no respondió; se reintenta con ${settings.fallback.provider}:`,
        error instanceof Error ? error.message : error,
      );

      try {
        return await callProvider(settings.fallback, settings.customInstructions, prompt);
      } catch (fallbackError) {
        if (fallbackError instanceof LlmError) {
          throw new AnalysisError(
            `No se pudo usar el modelo local y el respaldo en la nube tampoco respondió: ${fallbackError.message}`,
            502,
          );
        }
        throw fallbackError;
      }
    }

    if (error instanceof LlmError) throw new AnalysisError(error.message, 502);
    throw error;
  }
}

export interface RequestAnalysisInput {
  scope: AnalysisScope;
  canvasId?: string;
  force?: boolean;
}

export async function requestAnalysis(
  user: CurrentUser,
  input: RequestAnalysisInput,
): Promise<AnalysisView> {
  if (input.scope === 'session' && user.role !== 'facilitator') {
    throw new AnalysisError('No encontrado.', 404);
  }

  let trainingSessionId: string;
  let canvasId: string | null = null;
  let notes: SerializableNote[];
  let prompt: string;
  let truncated = false;

  if (input.scope === 'canvas') {
    if (!input.canvasId) throw new AnalysisError('Falta el lienzo a analizar.', 400);

    const access = await resolveCanvasAccess(user, input.canvasId);
    trainingSessionId = access.trainingSessionId;
    canvasId = access.canvasId;

    notes = await listNotesForCanvas(canvasId);
    if (notes.length === 0) {
      throw new AnalysisError('El lienzo está vacío: agrega notas antes de pedir un análisis.', 400);
    }

    const built = buildCanvasPrompt(notes);
    prompt = built.text;
    truncated = built.truncated;
  } else {
    if (!user.trainingSessionId) throw new AnalysisError('Sin capacitación activa.', 409);

    const [session] = await db
      .select({ id: trainingSessions.id })
      .from(trainingSessions)
      .where(
        and(
          eq(trainingSessions.id, user.trainingSessionId),
          eq(trainingSessions.facilitatorId, user.id),
        ),
      )
      .limit(1);

    if (!session) throw new AnalysisError('No encontrado.', 404);
    trainingSessionId = session.id;

    const participantCanvases = await db
      .select({ id: canvases.id })
      .from(canvases)
      .where(
        and(
          eq(canvases.trainingSessionId, trainingSessionId),
          eq(canvases.kind, 'participant'),
        ),
      )
      .orderBy(asc(canvases.createdAt));

    const all = await Promise.all(participantCanvases.map((c) => listNotesForCanvas(c.id)));
    const nonEmpty = all.filter((n) => n.length > 0);

    if (nonEmpty.length === 0) {
      throw new AnalysisError('Ningún participante tiene notas todavía.', 400);
    }

    notes = nonEmpty.flat();
    const built = buildSessionPrompt(nonEmpty);
    prompt = built.text;
    truncated = built.truncated;
  }

  const contentHash = canvasContentHash(notes);

  // 1. Caché: mover o recolorar notas no invalida el análisis; cambiar texto sí.
  if (!input.force) {
    const cached = await findCached(input.scope, canvasId, trainingSessionId, contentHash);
    if (cached?.result) {
      return {
        id: cached.id,
        scope: cached.scope,
        result: cached.result,
        score: cached.score,
        createdAt: cached.createdAt,
        model: cached.model,
        provider: cached.provider,
        cached: true,
      };
    }
  }

  // 2. Cuota (solo se evalúa cuando de verdad se va a llamar al proveedor).
  await enforceRateLimit(user);

  // El proveedor se resuelve ANTES de crear la fila: si en este entorno no hay
  // ninguno utilizable, el facilitador recibe el motivo y no queda un 'pending'
  // huérfano en la base de datos.
  const settings = await resolveActiveLlm(user);

  // 3. Fila 'pending': evita dos análisis simultáneos del mismo contenido.
  const [pending] = await db
    .insert(canvasAnalyses)
    .values({
      scope: input.scope,
      canvasId,
      trainingSessionId,
      requestedBy: user.id,
      contentHash,
      provider: settings.provider,
      model: settings.config.model,
      status: 'pending',
    })
    .returning();

  try {
    const generated = await generate(settings, prompt);

    const [saved] = await db.transaction(async (tx) => {
      // "Forzar uno nuevo" reemplaza al análisis vigente del mismo contenido:
      // el índice único de reutilización solo admite uno completado por clave,
      // así que el anterior se retira dentro de la misma transacción.
      if (input.force) {
        await tx
          .delete(canvasAnalyses)
          .where(
            and(
              eq(canvasAnalyses.scope, input.scope),
              canvasId ? eq(canvasAnalyses.canvasId, canvasId) : isNull(canvasAnalyses.canvasId),
              eq(canvasAnalyses.trainingSessionId, trainingSessionId),
              eq(canvasAnalyses.contentHash, contentHash),
              eq(canvasAnalyses.status, 'completed'),
            ),
          );
      }

      return tx
        .update(canvasAnalyses)
        .set({
          status: 'completed',
          result: generated.result,
          score: generated.result.puntuacion,
          inputTokens: generated.inputTokens,
          outputTokens: generated.outputTokens,
          // Si respondió el respaldo, la fila debe reflejarlo y no lo previsto.
          provider: generated.provider,
          model: generated.model,
        })
        .where(eq(canvasAnalyses.id, pending.id))
        .returning();
    });

    await db.insert(activityEvents).values({
      organizationId: user.organizationId,
      trainingSessionId,
      canvasId,
      actorId: user.id,
      type: 'analysis.completed',
      payload: { analysisId: saved.id, scope: input.scope, score: saved.score },
    });

    return {
      id: saved.id,
      scope: saved.scope,
      result: generated.result,
      score: saved.score,
      createdAt: saved.createdAt,
      model: saved.model,
      provider: saved.provider,
      cached: false,
      truncated,
    };
  } catch (error) {
    await db
      .update(canvasAnalyses)
      .set({
        status: 'failed',
        errorMessage: error instanceof Error ? error.message.slice(0, 500) : 'Error desconocido',
      })
      .where(eq(canvasAnalyses.id, pending.id));

    throw error;
  }
}

/** Análisis más reciente de un lienzo (o de la sesión), ya validado. */
export async function getLatestAnalysis(
  user: CurrentUser,
  scope: AnalysisScope,
  canvasId?: string,
): Promise<AnalysisView | null> {
  let where;

  if (scope === 'canvas') {
    if (!canvasId) return null;
    await resolveCanvasAccess(user, canvasId);
    where = and(
      eq(canvasAnalyses.scope, 'canvas'),
      eq(canvasAnalyses.canvasId, canvasId),
      eq(canvasAnalyses.status, 'completed'),
    );
  } else {
    if (user.role !== 'facilitator' || !user.trainingSessionId) return null;
    where = and(
      eq(canvasAnalyses.scope, 'session'),
      eq(canvasAnalyses.trainingSessionId, user.trainingSessionId),
      eq(canvasAnalyses.status, 'completed'),
    );
  }

  const [row] = await db
    .select()
    .from(canvasAnalyses)
    .where(where)
    .orderBy(desc(canvasAnalyses.createdAt))
    .limit(1);

  if (!row?.result) return null;

  return {
    id: row.id,
    scope: row.scope,
    result: row.result,
    score: row.score,
    createdAt: row.createdAt,
    model: row.model,
    provider: row.provider,
    cached: false,
  };
}

/** ¿El análisis vigente corresponde al contenido actual del lienzo? */
export async function isAnalysisCurrent(canvasId: string, analysisId: string): Promise<boolean> {
  const [canvas] = await db
    .select({ contentHash: canvases.contentHash })
    .from(canvases)
    .where(eq(canvases.id, canvasId))
    .limit(1);

  const [analysis] = await db
    .select({ contentHash: canvasAnalyses.contentHash })
    .from(canvasAnalyses)
    .where(eq(canvasAnalyses.id, analysisId))
    .limit(1);

  return Boolean(canvas?.contentHash && canvas.contentHash === analysis?.contentHash);
}
