import 'server-only';

import { getLocalOllamaBaseUrl, isLocallyBoundUrl, isLocalRuntime } from './runtime';
import {
  fetchWithTimeout,
  joinUrl,
  LlmError,
  translateHttpError,
  translateNetworkError,
  type LlmProvider,
  type LlmRequest,
  type LlmResponse,
  type LlmTestResult,
  type ProviderConfig,
} from './types';

interface OllamaChatResponse {
  message?: { content?: string };
  prompt_eval_count?: number;
  eval_count?: number;
}

/**
 * Ollama, local o remoto.
 *
 * En desarrollo, una URL base vacía significa "el Ollama de esta máquina"
 * (http://localhost:11434, configurable con OLLAMA_BASE_URL). En producción no
 * se asume ningún host: `resolveLlmRuntime()` ya habrá resuelto una URL pública
 * o derivado la petición al proveedor de respaldo, así que llegar aquí sin URL
 * es un error de configuración y se dice con esas palabras.
 *
 * La clave es opcional: solo se envía si hay un proxy o un Ollama Cloud que la exija.
 */
export function createOllamaProvider(config: ProviderConfig): LlmProvider {
  const baseUrl = config.baseUrl || (isLocalRuntime() ? getLocalOllamaBaseUrl() : '');

  async function call(request: LlmRequest, maxTokens: number, jsonMode: boolean) {
    if (!baseUrl) {
      throw new LlmError(
        'Ollama necesita una URL base accesible desde el servidor: en producción no existe localhost.',
      );
    }

    let response: Response;
    try {
      response = await fetchWithTimeout(joinUrl(baseUrl, '/api/chat'), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: config.model,
          stream: false,
          ...(jsonMode ? { format: 'json' } : {}),
          options: {
            temperature: request.temperature ?? 0.3,
            num_predict: maxTokens,
          },
          messages: [
            { role: 'system', content: request.system },
            { role: 'user', content: request.prompt },
          ],
        }),
      });
    } catch (error) {
      const translated = translateNetworkError(error);

      // Contra un Ollama local, "no se pudo alcanzar" casi siempre significa que
      // el servicio no está levantado: se dice cómo arreglarlo.
      if (isLocalRuntime() && isLocallyBoundUrl(baseUrl)) {
        throw new LlmError(
          `${translated.message} Comprueba que Ollama esté en marcha en ${baseUrl} (ejecuta "ollama serve").`,
          translated.kind,
        );
      }

      throw translated;
    }

    if (!response.ok) throw await translateHttpError(response, 'Ollama');

    const data = (await response.json()) as OllamaChatResponse;
    const raw = data.message?.content ?? '';

    if (!raw) throw new LlmError('El proveedor devolvió una respuesta vacía.');

    return {
      raw,
      inputTokens: data.prompt_eval_count ?? null,
      outputTokens: data.eval_count ?? null,
    } satisfies LlmResponse;
  }

  return {
    id: 'ollama',

    complete: (request) => call(request, request.maxOutputTokens, true),

    async test(): Promise<LlmTestResult> {
      const started = Date.now();
      try {
        await call({ system: 'Responde solo con: ok', prompt: 'ok', maxOutputTokens: 16 }, 16, false);
        return { ok: true, model: config.model, latencyMs: Date.now() - started };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : 'Error desconocido' };
      }
    },
  };
}
