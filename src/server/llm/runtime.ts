import 'server-only';

import type { LlmProviderKey } from '@/db/schema/enums';
import { isLocallyBoundUrl, normalizeBaseUrl } from '@/lib/llm-url';

import type { ProviderConfig } from './types';

/**
 * Resolución del proveedor de IA según DÓNDE se está ejecutando el servidor.
 *
 * El problema concreto: Ollama vive en la máquina del desarrollador
 * (http://localhost:11434) y la aplicación se publica en Netlify, donde ese
 * "localhost" es el propio contenedor de la función y no existe ningún modelo
 * escuchando. La configuración guardada en Neon es la misma en ambos sitios, así
 * que la diferencia no puede estar en la base de datos: se decide aquí, en
 * tiempo de ejecución.
 *
 * Nada de este módulo toca la base de datos. Recibe la configuración ya leída de
 * Neon y devuelve la que de verdad se puede usar en este entorno.
 */

export type LlmRuntimeEnvironment = 'local' | 'hosted';

/**
 * De dónde salió la configuración con la que se llamará al modelo:
 * - `configured`: la que guardó el facilitador en Neon.
 * - `local-ollama`: Ollama en la máquina de desarrollo, por defecto.
 * - `cloud-fallback`: proveedor de respaldo por variables de entorno.
 */
export type LlmConfigSource = 'configured' | 'local-ollama' | 'cloud-fallback';

/** Puerto por defecto de Ollama. Solo se usa en entorno local. */
export const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';

export { isLocallyBoundUrl } from '@/lib/llm-url';

/**
 * Entorno de ejecución.
 *
 * `LLM_RUNTIME_ENV` fuerza el valor cuando la detección automática no acierta
 * (por ejemplo, un túnel que sí expone Ollama desde producción).
 *
 * Ojo con `netlify dev`: define NETLIFY pero corre en la máquina del
 * desarrollador, así que ahí localhost SÍ existe y el entorno es local.
 */
export function getRuntimeEnvironment(): LlmRuntimeEnvironment {
  const override = process.env.LLM_RUNTIME_ENV?.trim().toLowerCase();
  if (override === 'local' || override === 'hosted') return override;

  if (process.env.NETLIFY_DEV === 'true' || process.env.NETLIFY_LOCAL === 'true') return 'local';

  if (process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL) {
    return 'hosted';
  }

  return process.env.NODE_ENV === 'production' ? 'hosted' : 'local';
}

export function isLocalRuntime(): boolean {
  return getRuntimeEnvironment() === 'local';
}

/**
 * URL de Ollama en desarrollo. `OLLAMA_BASE_URL` tiene prioridad; `OLLAMA_HOST`
 * es la variable que ya usa el propio cliente de Ollama y se acepta tal cual.
 */
export function getLocalOllamaBaseUrl(): string {
  return (
    normalizeBaseUrl(process.env.OLLAMA_BASE_URL) ||
    normalizeBaseUrl(process.env.OLLAMA_HOST) ||
    DEFAULT_OLLAMA_BASE_URL
  );
}

export interface CloudFallback {
  provider: LlmProviderKey;
  model: string;
  baseUrl: string;
  apiKey: string;
  /** Texto sin secretos, apto para la interfaz y los registros. */
  label: string;
}

function isProviderKey(value: string): value is LlmProviderKey {
  return value === 'anthropic' || value === 'openai' || value === 'ollama';
}

/**
 * Proveedor de respaldo para producción, definido solo por variables de entorno
 * (nunca por la base de datos: es una característica del despliegue, no de la
 * organización).
 *
 * Groq, OpenRouter, Together y compañía exponen la API de OpenAI, así que
 * `LLM_FALLBACK_PROVIDER="openai"` con su `LLM_FALLBACK_BASE_URL` basta para
 * cualquiera de ellos. Ollama Cloud (https://ollama.com) funciona con
 * `provider="ollama"` y su clave.
 */
export function getCloudFallback(): CloudFallback | null {
  const rawProvider = (process.env.LLM_FALLBACK_PROVIDER ?? 'openai').trim().toLowerCase();
  if (!isProviderKey(rawProvider)) return null;

  const model = process.env.LLM_FALLBACK_MODEL?.trim() ?? '';
  const baseUrl = normalizeBaseUrl(process.env.LLM_FALLBACK_BASE_URL);
  const apiKey = process.env.LLM_FALLBACK_API_KEY?.trim() ?? '';

  // Sin modelo no hay respaldo posible.
  if (!model) return null;

  // Ollama remoto puede ir sin clave detrás de un proxy, pero necesita URL.
  if (rawProvider === 'ollama' && !baseUrl) return null;
  if (rawProvider !== 'ollama' && !apiKey) return null;

  // Un respaldo apuntando a localhost repetiría el problema que viene a resolver.
  if (isLocallyBoundUrl(baseUrl)) return null;

  let host = '';
  try {
    host = baseUrl ? new URL(baseUrl).host : '';
  } catch {
    host = '';
  }

  return {
    provider: rawProvider,
    model,
    baseUrl,
    apiKey,
    label: process.env.LLM_FALLBACK_LABEL?.trim() || (host ? `${model} (${host})` : model),
  };
}

export function hasCloudFallback(): boolean {
  return getCloudFallback() !== null;
}

/** Mensaje único para cuando el análisis local no es alcanzable desde la nube. */
export function unreachableMessage(baseUrl: string): string {
  const dónde = baseUrl
    ? `La URL configurada (${baseUrl}) es una dirección local`
    : 'Ollama está configurado sin URL base, por lo que apuntaría a localhost';

  return (
    `${dónde} y el servidor de producción no puede alcanzarla: el análisis con Ollama ` +
    'solo funciona ejecutando la aplicación en el entorno de desarrollo. ' +
    'Para habilitarlo en producción, publica Ollama en una URL accesible desde internet ' +
    'y guárdala en Configuración, o define un proveedor de respaldo en la nube con las ' +
    'variables LLM_FALLBACK_* del despliegue.'
  );
}

export type ResolvedLlm =
  | {
      ok: true;
      provider: LlmProviderKey;
      config: ProviderConfig;
      source: LlmConfigSource;
      environment: LlmRuntimeEnvironment;
    }
  | { ok: false; reason: string; environment: LlmRuntimeEnvironment };

/**
 * Traduce la configuración guardada en Neon a la que de verdad se puede usar
 * aquí y ahora. La configuración de la organización no se modifica nunca: el
 * facilitador ve en Configuración lo que él guardó, no lo que resolvió el
 * entorno.
 */
export function resolveLlmRuntime(stored: {
  provider: LlmProviderKey;
  config: ProviderConfig;
}): ResolvedLlm {
  const environment = getRuntimeEnvironment();
  const storedBaseUrl = normalizeBaseUrl(stored.config.baseUrl);

  // Local: Ollama sin URL apunta al servidor de la máquina, sin configurar nada.
  if (stored.provider === 'ollama' && environment === 'local' && !storedBaseUrl) {
    return {
      ok: true,
      provider: 'ollama',
      config: { ...stored.config, baseUrl: getLocalOllamaBaseUrl() },
      source: 'local-ollama',
      environment,
    };
  }

  const unreachable =
    environment === 'hosted' &&
    (isLocallyBoundUrl(storedBaseUrl) || (stored.provider === 'ollama' && !storedBaseUrl));

  if (unreachable) {
    const fallback = getCloudFallback();

    if (fallback) {
      return {
        ok: true,
        provider: fallback.provider,
        config: {
          model: fallback.model,
          baseUrl: fallback.baseUrl,
          apiKey: fallback.apiKey,
          // El límite de salida sigue siendo el de la organización.
          maxOutputTokens: stored.config.maxOutputTokens,
        },
        source: 'cloud-fallback',
        environment,
      };
    }

    return { ok: false, reason: unreachableMessage(storedBaseUrl), environment };
  }

  return {
    ok: true,
    provider: stored.provider,
    config: { ...stored.config, baseUrl: storedBaseUrl },
    source: 'configured',
    environment,
  };
}

/**
 * ¿La dirección configurada es inalcanzable desde donde corre el servidor?
 * En local nunca lo es: localhost es precisamente donde está Ollama.
 */
function isUnreachableHere(provider: LlmProviderKey, baseUrl: string | null): boolean {
  if (getRuntimeEnvironment() === 'local') return false;

  const normalized = normalizeBaseUrl(baseUrl);
  return isLocallyBoundUrl(normalized) || (provider === 'ollama' && !normalized);
}

/**
 * ¿La petición acabaría en el proveedor de respaldo? Entonces la clave y la URL
 * de la organización dan igual: las pone el despliegue.
 */
export function willUseCloudFallback(provider: LlmProviderKey, baseUrl: string | null): boolean {
  return isUnreachableHere(provider, baseUrl) && hasCloudFallback();
}

/**
 * ¿Esta configuración podría llegar a ejecutarse en este entorno? Es la versión
 * barata de `resolveLlmRuntime` para las comprobaciones de disponibilidad, que
 * solo leen unas columnas y no descifran la clave.
 */
export function canRunHere(provider: LlmProviderKey, baseUrl: string | null): boolean {
  return !isUnreachableHere(provider, baseUrl) || hasCloudFallback();
}

/** Resumen sin secretos del entorno, para explicar en la interfaz qué ocurrirá. */
export interface LlmRuntimeInfo {
  environment: LlmRuntimeEnvironment;
  localOllamaBaseUrl: string;
  fallback: { provider: LlmProviderKey; label: string } | null;
}

export function describeLlmRuntime(): LlmRuntimeInfo {
  const fallback = getCloudFallback();

  return {
    environment: getRuntimeEnvironment(),
    localOllamaBaseUrl: getLocalOllamaBaseUrl(),
    fallback: fallback ? { provider: fallback.provider, label: fallback.label } : null,
  };
}
