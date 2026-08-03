import 'server-only';

import type { LlmProviderKey } from '@/db/schema/enums';

import { createAnthropicProvider } from './anthropic';
import { createGeminiProvider, GEMINI_DEFAULT_BASE_URL } from './gemini';
import { createOllamaProvider } from './ollama';
import { createOpenAiProvider } from './openai';
import type { LlmProvider, ProviderConfig } from './types';

export const PROVIDER_LABELS: Record<LlmProviderKey, string> = {
  anthropic: 'Anthropic Claude',
  openai: 'OpenAI (o cualquier API compatible)',
  ollama: 'Ollama (local o remoto)',
  gemini: 'Google Gemini (nivel gratuito)',
};

/** Modelos sugeridos en la UI; el campo sigue siendo libre. */
export const SUGGESTED_MODELS: Record<LlmProviderKey, string[]> = {
  anthropic: ['claude-sonnet-5', 'claude-opus-5', 'claude-haiku-4-5'],
  openai: ['gpt-4.1-mini', 'gpt-4.1', 'gpt-4o-mini'],
  ollama: ['llama3.1', 'qwen2.5', 'mistral'],
  gemini: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'],
};

export const DEFAULT_BASE_URLS: Record<LlmProviderKey, string> = {
  anthropic: 'https://api.anthropic.com',
  openai: 'https://api.openai.com',
  ollama: '',
  gemini: GEMINI_DEFAULT_BASE_URL,
};

/** Factoría por configuración. El resto del código no conoce al proveedor concreto. */
export function createProvider(provider: LlmProviderKey, config: ProviderConfig): LlmProvider {
  switch (provider) {
    case 'anthropic':
      return createAnthropicProvider(config);
    case 'openai':
      return createOpenAiProvider(config);
    case 'ollama':
      return createOllamaProvider(config);
    case 'gemini':
      return createGeminiProvider(config);
  }
}

export type { LlmProvider, LlmTestResult, ProviderConfig } from './types';
export { isRecoverableWithFallback, LlmError } from './types';
export {
  canRunHere,
  DEFAULT_OLLAMA_BASE_URL,
  describeLlmRuntime,
  getCloudFallback,
  getFallbackProviderConfig,
  getLocalOllamaBaseUrl,
  getRuntimeEnvironment,
  hasCloudFallback,
  isLocallyBoundUrl,
  isLocalRuntime,
  resolveLlmRuntime,
  unreachableMessage,
  willUseCloudFallback,
  type LlmConfigSource,
  type LlmRuntimeEnvironment,
  type LlmRuntimeInfo,
  type ResolvedLlm,
} from './runtime';
