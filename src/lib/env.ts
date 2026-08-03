import { z } from 'zod';

/**
 * Validación de variables de entorno del servidor.
 * Falla al arrancar con un mensaje claro en lugar de romper a mitad de una petición.
 * Nada de esto se expone al cliente.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  AUTH_SECRET: z.string().min(16, 'AUTH_SECRET debe tener al menos 16 caracteres'),
  AUTH_URL: z.string().url().optional(),
  APP_ENCRYPTION_KEY: z
    .string()
    .refine((value) => Buffer.from(value, 'base64').length === 32, {
      message: 'APP_ENCRYPTION_KEY debe ser de 32 bytes en base64 (openssl rand -base64 32)',
    }),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const detalle = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Configuración de entorno inválida:\n${detalle}\n\nRevisa .env.local (copia de .env.example).`,
    );
  }

  cached = parsed.data;
  return cached;
}

/**
 * Valores por defecto del proveedor de IA usados solo por la semilla (Fase 5).
 *
 * `baseUrl` vacía con el proveedor `ollama` no es un olvido: significa "que lo
 * resuelva el entorno" (src/server/llm/runtime.ts), que en desarrollo apunta al
 * Ollama de la máquina y en producción al respaldo LLM_FALLBACK_*.
 */
export function getLlmSeedDefaults() {
  return {
    provider: process.env.LLM_PROVIDER ?? 'anthropic',
    model: process.env.LLM_MODEL ?? 'claude-sonnet-5',
    baseUrl: process.env.LLM_BASE_URL ?? '',
    apiKey: process.env.LLM_API_KEY ?? '',
    maxOutputTokens: Number(process.env.LLM_MAX_OUTPUT_TOKENS ?? 1500),
  };
}
