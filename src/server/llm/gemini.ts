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

export const GEMINI_DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com';

/** Modelo del nivel gratuito de Google AI Studio. */
export const GEMINI_DEFAULT_MODEL = 'gemini-2.0-flash';

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

/**
 * Google Gemini (API de Google AI Studio).
 *
 * Es el respaldo pensado para producción: tiene un nivel gratuito y se llama por
 * HTTPS sin SDK, así que funciona dentro de una función de Netlify sin añadir
 * dependencias ni binarios nativos.
 *
 * La clave viaja en la cabecera `x-goog-api-key` y no en la query string, que
 * acabaría en los registros de acceso del proveedor y de cualquier proxy.
 */
export function createGeminiProvider(config: ProviderConfig): LlmProvider {
  const baseUrl = config.baseUrl || GEMINI_DEFAULT_BASE_URL;
  const model = config.model || GEMINI_DEFAULT_MODEL;

  async function call(
    request: LlmRequest,
    maxTokens: number,
    jsonMode: boolean,
  ): Promise<LlmResponse> {
    if (!config.apiKey) {
      throw new LlmError('Falta la clave API de Google Gemini.');
    }

    // El nombre del modelo va en la ruta: se codifica para que un valor escrito
    // a mano en Configuración no pueda alterar la URL.
    const path = `/v1beta/models/${encodeURIComponent(model)}:generateContent`;

    let response: Response;
    try {
      response = await fetchWithTimeout(joinUrl(baseUrl, path), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': config.apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: request.system }] },
          contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
          generationConfig: {
            temperature: request.temperature ?? 0.3,
            maxOutputTokens: maxTokens,
            ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
          },
        }),
      });
    } catch (error) {
      throw translateNetworkError(error);
    }

    if (!response.ok) throw await translateHttpError(response, 'Google Gemini');

    const data = (await response.json()) as GeminiResponse;

    if (data.promptFeedback?.blockReason) {
      throw new LlmError(
        `Google Gemini bloqueó la petición por sus filtros de contenido (${data.promptFeedback.blockReason}).`,
      );
    }

    const candidate = data.candidates?.[0];

    // Los modelos con razonamiento pueden devolver varias partes: se concatenan.
    const raw = (candidate?.content?.parts ?? [])
      .map((part) => part.text ?? '')
      .join('')
      .trim();

    if (!raw) {
      if (candidate?.finishReason === 'MAX_TOKENS') {
        throw new LlmError(
          'Google Gemini agotó el límite de salida antes de escribir la respuesta. Sube el límite máximo de salida en Configuración.',
        );
      }
      if (candidate?.finishReason === 'SAFETY') {
        throw new LlmError('Google Gemini descartó la respuesta por sus filtros de contenido.');
      }
      throw new LlmError('El proveedor devolvió una respuesta vacía.');
    }

    return {
      raw,
      inputTokens: data.usageMetadata?.promptTokenCount ?? null,
      outputTokens: data.usageMetadata?.candidatesTokenCount ?? null,
    };
  }

  return {
    id: 'gemini',

    complete: (request) => call(request, request.maxOutputTokens, true),

    async test(): Promise<LlmTestResult> {
      const started = Date.now();
      try {
        // Sin modo JSON: la prueba solo verifica clave, modelo y alcance de red.
        await call({ system: 'Responde solo con: ok', prompt: 'ok', maxOutputTokens: 16 }, 16, false);
        return { ok: true, model, latencyMs: Date.now() - started };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : 'Error desconocido' };
      }
    },
  };
}
