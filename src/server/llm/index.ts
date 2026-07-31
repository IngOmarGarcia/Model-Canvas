import 'server-only';

import type { LlmProviderKey } from '@/db/schema/enums';

import { createAnthropicProvider } from './anthropic';
import { createOllamaProvider } from './ollama';
import { createOpenAiProvider } from './openai';
import type { LlmProvider, ProviderConfig } from './types';

export const PROVIDER_LABELS: Record<LlmProviderKey, string> = {
  anthropic: 'Anthropic Claude',
  openai: 'OpenAI',
  ollama: 'Ollama (remoto)',
};

/** Modelos sugeridos en la UI; el campo sigue siendo libre. */
export const SUGGESTED_MODELS: Record<LlmProviderKey, string[]> = {
  anthropic: ['claude-sonnet-5', 'claude-opus-5', 'claude-haiku-4-5-20251001'],
  openai: ['gpt-4.1-mini', 'gpt-4.1', 'gpt-4o-mini'],
  ollama: ['llama3.1', 'qwen2.5', 'mistral'],
};

export const DEFAULT_BASE_URLS: Record<LlmProviderKey, string> = {
  anthropic: 'https://api.anthropic.com',
  openai: 'https://api.openai.com',
  ollama: '',
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
  }
}

export type { LlmProvider, LlmTestResult, ProviderConfig } from './types';
export { LlmError } from './types';
