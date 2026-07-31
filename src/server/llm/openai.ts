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

const DEFAULT_BASE_URL = 'https://api.openai.com';

interface ChatResponse {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export function createOpenAiProvider(config: ProviderConfig): LlmProvider {
  const baseUrl = config.baseUrl || DEFAULT_BASE_URL;

  async function call(
    request: LlmRequest,
    maxTokens: number,
    jsonMode: boolean,
  ): Promise<LlmResponse> {
    if (!config.apiKey) {
      throw new LlmError('Falta la clave API de OpenAI.');
    }

    let response: Response;
    try {
      response = await fetchWithTimeout(joinUrl(baseUrl, '/v1/chat/completions'), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          max_completion_tokens: maxTokens,
          temperature: request.temperature ?? 0.3,
          messages: [
            { role: 'system', content: request.system },
            { role: 'user', content: request.prompt },
          ],
          ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
        }),
      });
    } catch (error) {
      throw translateNetworkError(error);
    }

    if (!response.ok) throw translateHttpError(response.status, 'OpenAI');

    const data = (await response.json()) as ChatResponse;
    const raw = data.choices?.[0]?.message?.content ?? '';

    if (!raw) throw new LlmError('El proveedor devolvió una respuesta vacía.');

    return {
      raw,
      inputTokens: data.usage?.prompt_tokens ?? null,
      outputTokens: data.usage?.completion_tokens ?? null,
    };
  }

  return {
    id: 'openai',

    complete: (request) => call(request, request.maxOutputTokens, true),

    async test(): Promise<LlmTestResult> {
      const started = Date.now();
      try {
        // Sin modo JSON: la prueba solo verifica clave, modelo y alcance de red.
        await call({ system: 'Responde solo con: ok', prompt: 'ok', maxOutputTokens: 16 }, 16, false);
        return { ok: true, model: config.model, latencyMs: Date.now() - started };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : 'Error desconocido' };
      }
    },
  };
}
