import 'server-only';

import type { LlmProviderKey } from '@/db/schema/enums';

export interface LlmRequest {
  system: string;
  prompt: string;
  maxOutputTokens: number;
  temperature?: number;
}

export interface LlmResponse {
  raw: string;
  inputTokens: number | null;
  outputTokens: number | null;
}

export type LlmTestResult =
  | { ok: true; model: string; latencyMs: number }
  | { ok: false; error: string };

/**
 * Interfaz común a todos los proveedores. Ni la UI ni los servicios conocen al
 * proveedor concreto: `createProvider()` lo construye desde la configuración.
 */
export interface LlmProvider {
  readonly id: LlmProviderKey;
  complete(request: LlmRequest): Promise<LlmResponse>;
  test(): Promise<LlmTestResult>;
}

export interface ProviderConfig {
  model: string;
  baseUrl: string;
  apiKey: string;
  maxOutputTokens: number;
}

/** Error del proveedor ya traducido: nunca expone la clave ni el cuerpo crudo. */
export class LlmError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LlmError';
  }
}

export const REQUEST_TIMEOUT_MS = 60_000;

/** Longitud máxima del motivo que se propaga desde el proveedor. */
const PROVIDER_REASON_MAX = 300;

/**
 * Motivo del rechazo, tomado del campo estructurado del proveedor.
 *
 * Solo se lee `error.message` (o `message`), nunca el cuerpo crudo: así el
 * facilitador puede actuar sobre el problema real —saldo agotado, modelo
 * inexistente, parámetro no admitido— sin arriesgar que se filtre nada más de
 * la respuesta. Anthropic, OpenAI y Ollama comparten esta forma.
 */
async function readProviderReason(response: Response): Promise<string | null> {
  try {
    const data = (await response.json()) as {
      error?: { message?: unknown } | string;
      message?: unknown;
    };

    const reason =
      typeof data?.error === 'string'
        ? data.error
        : typeof data?.error === 'object' && typeof data.error?.message === 'string'
          ? data.error.message
          : typeof data?.message === 'string'
            ? data.message
            : null;

    const trimmed = reason?.trim();
    return trimmed ? trimmed.slice(0, PROVIDER_REASON_MAX) : null;
  } catch {
    // Cuerpo vacío o no JSON: se responde solo con el mensaje genérico.
    return null;
  }
}

/**
 * Traduce fallos de red y códigos HTTP a mensajes propios.
 *
 * Antes se descartaba la respuesta entera y un 400 solo decía "código 400",
 * lo que dejaba al facilitador sin forma de saber si el problema era el saldo,
 * el modelo o un parámetro: ahora se adjunta el motivo del proveedor.
 */
export async function translateHttpError(
  response: Response,
  providerLabel: string,
): Promise<LlmError> {
  const { status } = response;
  const reason = await readProviderReason(response);
  const suffix = reason ? ` Detalle del proveedor: ${reason}` : '';

  if (status === 401 || status === 403) {
    return new LlmError(`La clave API fue rechazada por el proveedor.${suffix}`);
  }
  if (status === 404) {
    return new LlmError(`El modelo o la URL base no existen en el proveedor.${suffix}`);
  }
  if (status === 429) {
    return new LlmError(
      `El proveedor limitó la cantidad de peticiones. Inténtalo más tarde.${suffix}`,
    );
  }
  if (status >= 500) {
    return new LlmError(`${providerLabel} tuvo un error interno. Inténtalo más tarde.${suffix}`);
  }
  return new LlmError(`El proveedor rechazó la petición (código ${status}).${suffix}`);
}

export function translateNetworkError(error: unknown): LlmError {
  if (error instanceof LlmError) return error;
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new LlmError('Se agotó el tiempo de espera del proveedor.');
  }
  return new LlmError('No se pudo alcanzar la URL base del proveedor.');
}

/** fetch con tiempo límite; el proveedor nunca deja la petición colgada. */
export async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
  } finally {
    clearTimeout(timer);
  }
}

/** Une la URL base con la ruta sin duplicar barras. */
export function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, '')}${path}`;
}
