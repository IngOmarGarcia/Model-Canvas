# 08 — Inteligencia artificial: análisis del lienzo

## Abstracción de proveedores

Una sola interfaz en `src/server/llm/types.ts`; tres implementaciones intercambiables. La UI y los
servicios nunca conocen al proveedor concreto.

```ts
export interface LlmRequest {
  system: string;
  prompt: string;
  maxOutputTokens: number;
  jsonSchema: unknown;      // contrato de salida esperado
}

export interface LlmResponse {
  raw: string;
  inputTokens: number | null;
  outputTokens: number | null;
}

export interface LlmProvider {
  readonly id: 'anthropic' | 'openai' | 'ollama';
  complete(req: LlmRequest): Promise<LlmResponse>;
  test(): Promise<{ ok: true; model: string } | { ok: false; error: string }>;
}
```

`createProvider(settings)` en `src/server/llm/index.ts` construye la implementación a partir de la
fila `llm_settings` (proveedor, modelo, `base_url`, clave descifrada, `max_output_tokens`).

| Proveedor | Endpoint | Autenticación | Notas |
| --------- | -------- | ------------- | ----- |
| Anthropic | `POST {baseUrl}/v1/messages` | cabecera `x-api-key` + `anthropic-version` | Predeterminado. Modelos sugeridos: `claude-sonnet-5` (equilibrio) o `claude-opus-5`. |
| OpenAI | `POST {baseUrl}/v1/chat/completions` | `Authorization: Bearer` | `response_format` JSON cuando el modelo lo admite. |
| Ollama (local o remoto) | `POST {baseUrl}/api/chat` | opcional (`Authorization` si hay proxy u Ollama Cloud) | `baseUrl` vacía = la resuelve el entorno (ver abajo). Sin clave en instalaciones abiertas. `format: "json"`. |

`baseUrl` siempre proviene de la configuración o de variables de entorno; nunca está codificada.

## Resolución por entorno (Ollama local vs. Netlify)

La configuración vive en Neon y es **la misma** en desarrollo y en producción, pero un
`http://localhost:11434` solo existe en la máquina del desarrollador: dentro de una función de
Netlify apunta al propio contenedor, donde no hay ningún modelo. La diferencia, por tanto, no puede
estar en la base de datos y se decide en tiempo de ejecución, en `src/server/llm/runtime.ts`.

`resolveLlmRuntime()` recibe la configuración leída de Neon y devuelve la que de verdad se puede
usar aquí. **No modifica nunca la fila**: el facilitador sigue viendo en Configuración lo que él
guardó.

| Entorno | `base_url` guardada | Resultado (`source`) |
| ------- | ------------------- | -------------------- |
| local | vacía (Ollama) | `local-ollama`: `OLLAMA_BASE_URL` → `OLLAMA_HOST` → `http://localhost:11434` |
| local | cualquiera | `configured` |
| producción | pública | `configured` |
| producción | local/privada, o vacía con Ollama | `cloud-fallback` si hay `LLM_FALLBACK_*`; si no, error 409 con un mensaje que explica que Ollama solo funciona en desarrollo |

Se consideran inalcanzables desde producción `localhost`, `127.0.0.0/8`, `::1`, `0.0.0.0`,
`10/8`, `192.168/16`, `172.16–31/12`, `host.docker.internal` y los sufijos `.local` e `.internal`.

**Detección del entorno** (`getRuntimeEnvironment()`): `LLM_RUNTIME_ENV` (`local` | `hosted`) manda
sobre todo; `NETLIFY_DEV` es *local* aunque defina `NETLIFY`, porque `netlify dev` corre en la
máquina del desarrollador; `NETLIFY`, `AWS_LAMBDA_FUNCTION_NAME` o `VERCEL` son *hosted*; en último
término decide `NODE_ENV`.

**Respaldo en la nube.** Se define solo por variables de entorno del despliegue, nunca por la base
de datos: es una característica del alojamiento, no de la organización.

| Variable | Uso |
| -------- | --- |
| `LLM_FALLBACK_PROVIDER` | `openai` (por defecto), `anthropic` u `ollama` |
| `LLM_FALLBACK_BASE_URL` | URL del proveedor compatible (Groq, OpenRouter, Together, Ollama Cloud…) |
| `LLM_FALLBACK_MODEL` | Obligatoria: sin modelo no hay respaldo |
| `LLM_FALLBACK_API_KEY` | Obligatoria salvo con `ollama` detrás de un proxy abierto |
| `LLM_FALLBACK_LABEL` | Texto para la interfaz; por defecto `modelo (host)` |

El respaldo se ignora si está incompleto o si apunta a una dirección local, y **solo** entra en
juego cuando la configuración de la organización es inalcanzable: un Anthropic u OpenAI bien
configurados nunca se desvían. `max_output_tokens` sigue siendo el de la organización, y las filas
de `canvas_analyses` registran el proveedor y el modelo que de verdad respondieron.

Sin respaldo definido no hay error de red: `isAnalysisAvailable()` devuelve `false`, el participante
ve el panel de "no disponible" y el facilitador recibe en Configuración el motivo exacto.

## Manejo de claves

- Se capturan por Server Action, se cifran con **AES-256-GCM** usando `APP_ENCRYPTION_KEY` y se
  guardan en `llm_settings.api_key_ciphertext`. Ver [09 — Seguridad](./09-seguridad.md).
- El descifrado ocurre únicamente dentro de `src/server/llm/*`, en petición de servidor.
- Ningún endpoint, DTO, log ni mensaje de error devuelve la clave. La UI solo ve
  `{ hasApiKey: true, last4: '1234' }`.
- Todas las llamadas al proveedor salen del servidor: el navegador nunca contacta al proveedor.

## Prueba de conexión

`POST /api/llm/test` (solo facilitador). Envía una petición mínima con `max_output_tokens` bajo y
devuelve `{ ok, model, latencyMs }` o un error **traducido** (`clave inválida`, `modelo
inexistente`, `no se pudo alcanzar la URL base`, `tiempo de espera agotado`). Nunca se propaga el
cuerpo crudo del proveedor, que puede contener fragmentos de la clave.

## Contrato de salida del análisis

Un único esquema Zod (`analysisResultSchema`) valida la respuesta antes de guardarla:

```jsonc
{
  "resumen": "string (máx. 600 caracteres)",
  "fortalezas":      [{ "titulo": "string", "detalle": "string", "modulo": "customer_segments|…|null" }],
  "debilidades":     [{ "titulo": "string", "detalle": "string", "modulo": "…|null" }],
  "riesgos":         [{ "titulo": "string", "detalle": "string", "severidad": "baja|media|alta" }],
  "recomendaciones": [{ "titulo": "string", "detalle": "string", "prioridad": 1 }],
  "puntuacion": 0
}
```

- `puntuacion`: entero 0–100, criterio fijado en el prompt (cobertura de los nueve módulos,
  coherencia entre segmentos y propuesta de valor, y viabilidad económica).
- Si la respuesta no valida, se reintenta **una vez** con instrucción de corrección; si vuelve a
  fallar, el análisis se guarda con `status = 'failed'` y la UI ofrece reintentar. No se muestran
  respuestas sin validar.

## Prompt

- **System:** rol de mentor en modelos de negocio; salida exclusivamente JSON conforme al esquema;
  idioma español; tono formativo y concreto; sin inventar datos que no estén en el lienzo.
- **Contexto:** nombre y descripción breve de los nueve módulos (desde `lib/bmc/modules.ts`) para
  que el modelo evalúe con la misma terminología que ve el participante.
- **Datos:** el lienzo serializado como lista por módulo, en orden metodológico, solo con el texto
  de las notas. No se envían nombres de participantes, ids, correos ni posiciones.
- **Instrucciones personalizadas:** `llm_settings.custom_instructions` se anexa al final del system,
  claramente delimitado y siempre subordinado a las reglas de formato.

**Alcance `session`:** el análisis general agrega los lienzos de la sesión de forma anónima
(`Participante 1`, `Participante 2`, …) y pide patrones comunes, vacíos recurrentes y una
puntuación promedio de la capacitación.

## Optimización de costo

1. **Reutilización por hash.** `content_hash = sha256(json normalizado)`: por cada módulo en orden
   metodológico, los textos de sus notas normalizados (recortados, minúsculas, sin espacios
   redundantes) y **ordenados alfabéticamente**. Excluye ids, colores, posiciones y marcas de
   tiempo — mover o recolorar una nota no invalida el análisis; cambiar el texto sí.
2. Antes de llamar al proveedor se busca un análisis `completed` con el mismo `scope` +
   `canvas_id`/`training_session_id` + `content_hash`. Si existe, se devuelve con
   `{ cached: true, createdAt }` y la UI indica "Análisis vigente — sin cambios desde …". Botón
   *Forzar nuevo análisis* solo para el facilitador.
3. **Rate limit por usuario:** ventana deslizante en base de datos sobre `canvas_analyses`.
   Participante: 5 análisis/hora y 20/día. Facilitador: 20/hora (incluye los de sesión). Al superarlo
   se responde `429` con el tiempo restante; las peticiones servidas desde caché **no** consumen
   cuota.
4. **Techo de entrada:** si el lienzo supera ~300 notas o 40 000 caracteres, se truncan las notas
   más antiguas por módulo y se avisa en la UI.
5. `max_output_tokens` configurable (por defecto 1500) y `temperature` baja (0.3) para salidas
   estables y baratas.
6. Se registran `input_tokens` / `output_tokens` por análisis para poder estimar el gasto de la
   capacitación.

## Flujo

```
UI "Solicitar análisis"
      │ POST /api/analysis { scope, canvasId }
      ▼
autorizar → rate limit → calcular content_hash → ¿caché? ─sí→ devolver análisis existente
      │ no
      ▼
crear fila 'pending' → descifrar clave → createProvider() → complete()
      │
      ▼
validar con Zod ──falla→ reintento único ──falla→ status 'failed'
      │ ok
      ▼
guardar result + score + tokens (status 'completed') → activity_event 'analysis.completed'
```

La petición responde en la misma llamada (con `AbortSignal` y tiempo de espera de 60 s). El estado
`pending` en base de datos evita análisis duplicados simultáneos sobre el mismo lienzo.
