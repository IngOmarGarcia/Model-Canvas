import 'server-only';

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
 * Ollama remoto. La URL base es obligatoria y viene de la configuración: no se
 * asume localhost ni ningún host concreto (docs/00, restricciones de producto).
 * La clave es opcional; solo se envía si hay un proxy que la exija.
 */
export function createOllamaProvider(config: ProviderConfig): LlmProvider {
  async function call(request: LlmRequest, maxTokens: number, jsonMode: boolean) {
    if (!config.baseUrl) {
      throw new LlmError('Ollama necesita una URL base configurada.');
    }

    let response: Response;
    try {
      response = await fetchWithTimeout(joinUrl(config.baseUrl, '/api/chat'), {
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
      throw translateNetworkError(error);
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
