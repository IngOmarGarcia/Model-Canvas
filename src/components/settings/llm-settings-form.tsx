'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Loader2, Plug, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  CUSTOM_INSTRUCTIONS_MAX,
  llmSettingsSchema,
  MAX_OUTPUT_MAX,
  MAX_OUTPUT_MIN,
  type LlmSettingsInput,
} from '@/lib/validation/llm-settings';
import { saveLlmSettingsAction, testLlmConnectionAction } from '@/server/actions/settings.actions';
import type { LlmSettingsDto } from '@/server/services/llm-settings.service';
import { tiempoRelativo } from '@/lib/utils';

const PROVIDERS = [
  { key: 'anthropic', label: 'Anthropic Claude', defaultUrl: 'https://api.anthropic.com' },
  { key: 'openai', label: 'OpenAI', defaultUrl: 'https://api.openai.com' },
  { key: 'ollama', label: 'Ollama (remoto)', defaultUrl: '' },
] as const;

const SUGGESTED: Record<string, string[]> = {
  anthropic: ['claude-sonnet-5', 'claude-opus-5', 'claude-haiku-4-5-20251001'],
  openai: ['gpt-4.1-mini', 'gpt-4.1', 'gpt-4o-mini'],
  ollama: ['llama3.1', 'qwen2.5', 'mistral'],
};

export function LlmSettingsForm({ settings }: { settings: LlmSettingsDto }) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<
    { ok: true; model: string; latencyMs: number } | { ok: false; error: string } | null
  >(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<LlmSettingsInput>({
    resolver: zodResolver(llmSettingsSchema),
    defaultValues: {
      provider: settings.provider,
      model: settings.model,
      baseUrl: settings.baseUrl,
      apiKey: '',
      maxOutputTokens: settings.maxOutputTokens,
      customInstructions: settings.customInstructions,
      isEnabled: settings.isEnabled,
    },
  });

  const provider = watch('provider');

  async function onSubmit(values: LlmSettingsInput) {
    const result = await saveLlmSettingsAction(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setValue('apiKey', '');
    toast.success('Configuración guardada');
  }

  async function onTest() {
    setTesting(true);
    setTestResult(null);

    const result = await testLlmConnectionAction();
    setTesting(false);

    if (!result.ok) {
      setTestResult({ ok: false, error: result.error });
      return;
    }
    setTestResult(result.data);
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="provider">Proveedor</Label>
              <select
                id="provider"
                className="border-input bg-surface h-11 w-full rounded-md border px-3 text-base"
                {...register('provider', {
                  onChange: (event) => {
                    const next = PROVIDERS.find((p) => p.key === event.target.value);
                    if (next) setValue('baseUrl', next.defaultUrl, { shouldDirty: true });
                  },
                })}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Modelo</Label>
              <Input id="model" list="modelos" aria-invalid={Boolean(errors.model)} {...register('model')} />
              <datalist id="modelos">
                {(SUGGESTED[provider] ?? []).map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
              {errors.model && <p className="text-destructive text-sm">{errors.model.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="baseUrl">
              URL base {provider === 'ollama' && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="baseUrl"
              placeholder={provider === 'ollama' ? 'https://mi-servidor-ollama.ejemplo' : ''}
              aria-invalid={Boolean(errors.baseUrl)}
              {...register('baseUrl')}
            />
            {errors.baseUrl && <p className="text-destructive text-sm">{errors.baseUrl.message}</p>}
            <p className="text-muted-foreground text-xs">
              Nunca se asume un host: Ollama requiere una URL alcanzable desde el servidor.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">Clave API</Label>
            <Input
              id="apiKey"
              type="password"
              autoComplete="off"
              placeholder={
                settings.hasApiKey
                  ? `Guardada ••••${settings.apiKeyLast4 ?? ''} — escribe para reemplazarla`
                  : 'Pega aquí la clave del proveedor'
              }
              {...register('apiKey')}
            />
            <p className="text-muted-foreground text-xs">
              Se cifra con AES-256-GCM en el servidor y nunca se devuelve al navegador. Déjala vacía
              para conservar la actual.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maxOutputTokens">Límite máximo de salida (tokens)</Label>
              <Input
                id="maxOutputTokens"
                type="number"
                min={MAX_OUTPUT_MIN}
                max={MAX_OUTPUT_MAX}
                aria-invalid={Boolean(errors.maxOutputTokens)}
                {...register('maxOutputTokens')}
              />
              {errors.maxOutputTokens && (
                <p className="text-destructive text-sm">{errors.maxOutputTokens.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="isEnabled">Estado</Label>
              <label className="border-input bg-surface flex h-11 items-center gap-2 rounded-md border px-3">
                <input id="isEnabled" type="checkbox" {...register('isEnabled')} />
                <span className="text-sm">Habilitar el análisis por IA</span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customInstructions">Instrucciones personalizadas para el análisis</Label>
            <Textarea
              id="customInstructions"
              rows={4}
              maxLength={CUSTOM_INSTRUCTIONS_MAX}
              placeholder="Ej. Enfoca las recomendaciones en emprendimientos de servicios en etapa temprana."
              {...register('customInstructions')}
            />
            <p className="text-muted-foreground text-xs">
              Se añaden al final del prompt y quedan subordinadas al formato JSON.
            </p>
          </div>

          {testResult && (
            <Alert variant={testResult.ok ? 'accent' : 'destructive'}>
              <AlertDescription className="flex items-center gap-2">
                {testResult.ok ? (
                  <>
                    <CheckCircle2 className="size-4" />
                    Conexión correcta con <strong>{testResult.model}</strong> ({testResult.latencyMs}{' '}
                    ms)
                  </>
                ) : (
                  <>
                    <XCircle className="size-4" />
                    {testResult.error}
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Guardar
            </Button>

            <Button type="button" variant="outline" onClick={onTest} disabled={testing || isDirty}>
              {testing ? <Loader2 className="size-4 animate-spin" /> : <Plug className="size-4" />}
              Probar conexión
            </Button>

            {isDirty && (
              <span className="text-muted-foreground text-xs">
                Guarda los cambios antes de probar.
              </span>
            )}

            {!isDirty && settings.lastTestedAt && (
              <span className="text-muted-foreground text-xs">
                Última prueba {tiempoRelativo(settings.lastTestedAt)} ·{' '}
                {settings.lastTestOk ? 'correcta' : 'fallida'}
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
