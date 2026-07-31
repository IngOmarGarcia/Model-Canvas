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

const DEFAULT_BASE_URL = 'https://api.anthropic.com';
const API_VERSION = '2023-06-01';

interface MessagesResponse {
  content?: { type: string; text?: string }[];
  usage?: { input_tokens?: number; output_tokens?: number };
}

/** Proveedor Anthropic (API de mensajes). La clave solo se usa aquí, en servidor. */
export function createAnthropicProvider(config: ProviderConfig): LlmProvider {
  const baseUrl = config.baseUrl || DEFAULT_BASE_URL;

  async function call(request: LlmRequest, maxTokens: number): Promise<LlmResponse> {
    if (!config.apiKey) {
      throw new LlmError('Falta la clave API de Anthropic.');
    }

    let response: Response;
    try {
      response = await fetchWithTimeout(joinUrl(baseUrl, '/v1/messages'), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': API_VERSION,
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: maxTokens,
          temperature: request.temperature ?? 0.3,
          system: request.system,
          messages: [{ role: 'user', content: request.prompt }],
        }),
      });
    } catch (error) {
      throw translateNetworkError(error);
    }

    if (!response.ok) throw translateHttpError(response.status, 'Anthropic');

    const data = (await response.json()) as MessagesResponse;
    const raw = (data.content ?? [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text ?? '')
      .join('');

    if (!raw) throw new LlmError('El proveedor devolvió una respuesta vacía.');

    return {
      raw,
      inputTokens: data.usage?.input_tokens ?? null,
      outputTokens: data.usage?.output_tokens ?? null,
    };
  }

  return {
    id: 'anthropic',

    complete: (request) => call(request, request.maxOutputTokens),

    async test(): Promise<LlmTestResult> {
      const started = Date.now();
      try {
        // Petición mínima: confirma clave, modelo y URL sin gastar tokens.
        await call(
          { system: 'Responde solo con: ok', prompt: 'ok', maxOutputTokens: 16 },
          16,
        );
        return { ok: true, model: config.model, latencyMs: Date.now() - started };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : 'Error desconocido' };
      }
    },
  };
}
