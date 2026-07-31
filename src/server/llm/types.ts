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

/**
 * Traduce fallos de red y códigos HTTP a mensajes propios.
 * El cuerpo del proveedor puede contener fragmentos de la clave, así que no se
 * propaga nunca.
 */
export function translateHttpError(status: number, providerLabel: string): LlmError {
  if (status === 401 || status === 403) {
    return new LlmError('La clave API fue rechazada por el proveedor.');
  }
  if (status === 404) {
    return new LlmError('El modelo o la URL base no existen en el proveedor.');
  }
  if (status === 429) {
    return new LlmError('El proveedor limitó la cantidad de peticiones. Inténtalo más tarde.');
  }
  if (status >= 500) {
    return new LlmError(`${providerLabel} tuvo un error interno. Inténtalo más tarde.`);
  }
  return new LlmError(`El proveedor rechazó la petición (código ${status}).`);
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
