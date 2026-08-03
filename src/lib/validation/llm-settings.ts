import { z } from 'zod';

export const MAX_OUTPUT_MIN = 256;
export const MAX_OUTPUT_MAX = 8000;
export const CUSTOM_INSTRUCTIONS_MAX = 2000;

const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .refine((value) => value === '' || /^https?:\/\/.+/i.test(value), {
    message: 'Debe ser una URL http(s) válida',
  })
  .optional()
  .default('');

/**
 * Con Ollama la URL base es opcional a propósito: si se deja vacía, el servidor
 * decide según el entorno (en desarrollo, el Ollama de la máquina; en producción,
 * el proveedor de respaldo o un aviso claro). Ver src/server/llm/runtime.ts.
 */
export const llmSettingsSchema = z.object({
  provider: z.enum(['anthropic', 'openai', 'ollama', 'gemini']),
  model: z.string().trim().min(1, 'Indica el modelo').max(120),
  baseUrl: optionalUrl,
  /**
   * Vacío significa "conserva la clave actual": la clave guardada nunca
   * vuelve al cliente, así que el formulario no puede reenviarla.
   */
  apiKey: z.string().trim().max(300).optional().default(''),
  maxOutputTokens: z.coerce
    .number()
    .int()
    .min(MAX_OUTPUT_MIN, `Mínimo ${MAX_OUTPUT_MIN}`)
    .max(MAX_OUTPUT_MAX, `Máximo ${MAX_OUTPUT_MAX}`),
  customInstructions: z.string().trim().max(CUSTOM_INSTRUCTIONS_MAX).optional().default(''),
  isEnabled: z.boolean().default(false),
});

export type LlmSettingsInput = z.infer<typeof llmSettingsSchema>;
