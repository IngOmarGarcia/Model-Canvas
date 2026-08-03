import 'server-only';

import { eq } from 'drizzle-orm';

import { db } from '@/db';
import type { LlmProviderKey } from '@/db/schema/enums';
import { llmSettings } from '@/db/schema';
import { decryptSecret, encryptSecret, last4 } from '@/lib/crypto';
import type { LlmSettingsInput } from '@/lib/validation/llm-settings';
import {
  canRunHere,
  DEFAULT_BASE_URLS,
  describeLlmRuntime,
  resolveLlmRuntime,
  unreachableMessage,
  willUseCloudFallback,
  type LlmRuntimeInfo,
  type ResolvedLlm,
} from '@/server/llm';
import type { ProviderConfig } from '@/server/llm/types';

import type { CurrentUser } from '../session';

export class NotAllowedError extends Error {
  constructor(message = 'No tienes permiso para esta operación.') {
    super(message);
    this.name = 'NotAllowedError';
  }
}

/**
 * DTO que sí puede salir al cliente. NUNCA incluye la clave: solo si existe y
 * sus últimos 4 caracteres (docs/03, regla 6).
 */
export interface LlmSettingsDto {
  provider: LlmProviderKey;
  model: string;
  baseUrl: string;
  hasApiKey: boolean;
  apiKeyLast4: string | null;
  maxOutputTokens: number;
  customInstructions: string;
  isEnabled: boolean;
  lastTestedAt: Date | null;
  lastTestOk: boolean | null;
  /**
   * Entorno donde corre el servidor y respaldo disponible. No sale de la base de
   * datos sino del despliegue, y no contiene ningún secreto: sirve para que el
   * formulario explique qué pasará con Ollama aquí.
   */
  runtime: LlmRuntimeInfo;
}

const DEFAULTS: Omit<LlmSettingsDto, 'runtime'> = {
  provider: 'anthropic',
  model: 'claude-sonnet-5',
  baseUrl: DEFAULT_BASE_URLS.anthropic,
  hasApiKey: false,
  apiKeyLast4: null,
  // El esquema del análisis admite hasta 5 elementos en cada una de sus cuatro
  // listas, con detalles de 600 caracteres: por debajo de ~3000 tokens la
  // respuesta se corta a media llave y deja de ser JSON válido.
  maxOutputTokens: 4000,
  customInstructions: '',
  isEnabled: false,
  lastTestedAt: null,
  lastTestOk: null,
};

export async function getLlmSettings(user: CurrentUser): Promise<LlmSettingsDto> {
  if (user.role !== 'facilitator') throw new NotAllowedError();

  const [row] = await db
    .select()
    .from(llmSettings)
    .where(eq(llmSettings.organizationId, user.organizationId))
    .limit(1);

  const runtime = describeLlmRuntime();

  if (!row) return { ...DEFAULTS, runtime };

  return {
    runtime,
    provider: row.provider,
    model: row.model,
    baseUrl: row.baseUrl ?? '',
    hasApiKey: Boolean(row.apiKeyCiphertext),
    apiKeyLast4: row.apiKeyLast4,
    maxOutputTokens: row.maxOutputTokens,
    customInstructions: row.customInstructions ?? '',
    isEnabled: row.isEnabled,
    lastTestedAt: row.lastTestedAt,
    lastTestOk: row.lastTestOk,
  };
}

export async function saveLlmSettings(user: CurrentUser, input: LlmSettingsInput) {
  if (user.role !== 'facilitator') throw new NotAllowedError();

  const [existing] = await db
    .select()
    .from(llmSettings)
    .where(eq(llmSettings.organizationId, user.organizationId))
    .limit(1);

  // Clave vacía = conservar la actual; con valor = cifrar y reemplazar.
  const apiKeyFields = input.apiKey
    ? { apiKeyCiphertext: encryptSecret(input.apiKey), apiKeyLast4: last4(input.apiKey) }
    : {};

  const values = {
    provider: input.provider,
    model: input.model,
    baseUrl: input.baseUrl || null,
    maxOutputTokens: input.maxOutputTokens,
    customInstructions: input.customInstructions || null,
    isEnabled: input.isEnabled,
    updatedBy: user.id,
    ...apiKeyFields,
  };

  if (existing) {
    await db.update(llmSettings).set(values).where(eq(llmSettings.id, existing.id));
  } else {
    await db.insert(llmSettings).values({ organizationId: user.organizationId, ...values });
  }
}

/**
 * Configuración con la clave descifrada. De uso EXCLUSIVO del servidor: no
 * existe ninguna ruta que devuelva esto al cliente.
 */
export async function getProviderConfig(
  user: CurrentUser,
): Promise<{ provider: LlmProviderKey; config: ProviderConfig; customInstructions: string } | null> {
  const [row] = await db
    .select()
    .from(llmSettings)
    .where(eq(llmSettings.organizationId, user.organizationId))
    .limit(1);

  if (!row) return null;

  return {
    provider: row.provider,
    customInstructions: row.customInstructions ?? '',
    config: {
      model: row.model,
      baseUrl: row.baseUrl ?? DEFAULT_BASE_URLS[row.provider],
      apiKey: row.apiKeyCiphertext ? decryptSecret(row.apiKeyCiphertext) : '',
      maxOutputTokens: row.maxOutputTokens,
    },
  };
}

/**
 * Configuración lista para usarse EN ESTE ENTORNO.
 *
 * Es la que deben pedir el análisis y la prueba de conexión: parte de lo que el
 * facilitador guardó en Neon y le aplica las reglas del entorno (Ollama local en
 * desarrollo, respaldo en la nube o mensaje claro en producción).
 */
export async function getResolvedLlmRuntime(
  user: CurrentUser,
): Promise<{ resolved: ResolvedLlm; customInstructions: string } | null> {
  const stored = await getProviderConfig(user);
  if (!stored) return null;

  return {
    resolved: resolveLlmRuntime({ provider: stored.provider, config: stored.config }),
    customInstructions: stored.customInstructions,
  };
}

export async function recordTestResult(user: CurrentUser, ok: boolean) {
  await db
    .update(llmSettings)
    .set({ lastTestedAt: new Date(), lastTestOk: ok })
    .where(eq(llmSettings.organizationId, user.organizationId));
}

export function isConfigured(settings: LlmSettingsDto): boolean {
  if (!settings.isEnabled) return false;

  // Con respaldo activo, la clave y la URL las pone el despliegue.
  if (willUseCloudFallback(settings.provider, settings.baseUrl)) return true;
  if (!canRunHere(settings.provider, settings.baseUrl)) return false;

  // Ollama no necesita clave; los demás proveedores sí.
  return settings.provider === 'ollama' || settings.hasApiKey;
}

/**
 * Por qué el análisis no está disponible, en palabras para el facilitador.
 * Solo tiene sentido cuando `isConfigured()` es falso.
 */
export function describeUnavailability(settings: LlmSettingsDto): string {
  if (!settings.isEnabled) {
    return 'Ve a Configuración, elige el proveedor y habilita el análisis por IA.';
  }

  if (!canRunHere(settings.provider, settings.baseUrl)) {
    return unreachableMessage(settings.baseUrl);
  }

  return 'Ve a Configuración y guarda la clave del proveedor para poder usarlo.';
}

/**
 * ¿La organización tiene el análisis habilitado y utilizable?
 * Pensada para el participante, que NO puede leer la configuración: solo recibe
 * este booleano, sin proveedor, modelo ni clave (docs/03, regla 6).
 */
export async function isAnalysisAvailable(organizationId: string): Promise<boolean> {
  const [row] = await db
    .select({
      isEnabled: llmSettings.isEnabled,
      provider: llmSettings.provider,
      hasKey: llmSettings.apiKeyCiphertext,
      baseUrl: llmSettings.baseUrl,
    })
    .from(llmSettings)
    .where(eq(llmSettings.organizationId, organizationId))
    .limit(1);

  if (!row?.isEnabled) return false;

  if (willUseCloudFallback(row.provider, row.baseUrl)) return true;
  if (!canRunHere(row.provider, row.baseUrl)) return false;

  return row.provider === 'ollama' || Boolean(row.hasKey);
}
