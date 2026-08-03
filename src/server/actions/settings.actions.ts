'use server';

import { revalidatePath } from 'next/cache';

import { fail, fromZodError, ok, type ActionResult } from '@/lib/action-result';
import { llmSettingsSchema } from '@/lib/validation/llm-settings';
import { createProvider, type LlmTestResult } from '@/server/llm';

import {
  getResolvedLlmRuntime,
  NotAllowedError,
  recordTestResult,
  saveLlmSettings,
} from '../services/llm-settings.service';
import { requireRole } from '../session';

export async function saveLlmSettingsAction(input: unknown): Promise<ActionResult<void>> {
  const user = await requireRole('facilitator');

  const parsed = llmSettingsSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error.issues);

  try {
    await saveLlmSettings(user, parsed.data);
    revalidatePath('/f/configuracion');
    return ok();
  } catch (error) {
    if (error instanceof NotAllowedError) return fail(error.message);
    console.error('[settings.actions] guardar', error);
    return fail('No se pudo guardar la configuración.');
  }
}

/**
 * Prueba de conexión con el proveedor.
 *
 * Prueba el proveedor RESUELTO, no el guardado: así el resultado corresponde a
 * lo que ocurrirá al pedir un análisis desde este mismo entorno (Ollama local en
 * desarrollo, respaldo en la nube en Netlify).
 *
 * Devuelve un error traducido; nunca el cuerpo crudo del proveedor, que podría
 * contener fragmentos de la clave (docs/08).
 */
export async function testLlmConnectionAction(): Promise<ActionResult<LlmTestResult>> {
  const user = await requireRole('facilitator');

  try {
    const runtime = await getResolvedLlmRuntime(user);
    if (!runtime) return fail('Primero guarda la configuración del proveedor.');

    if (!runtime.resolved.ok) {
      await recordTestResult(user, false);
      revalidatePath('/f/configuracion');
      return ok({ ok: false, error: runtime.resolved.reason });
    }

    const provider = createProvider(runtime.resolved.provider, runtime.resolved.config);
    const result = await provider.test();

    await recordTestResult(user, result.ok);
    revalidatePath('/f/configuracion');

    return ok(result);
  } catch (error) {
    console.error('[settings.actions] prueba', error);
    return fail('No se pudo completar la prueba de conexión.');
  }
}
