# 04 — Modelo de datos (PostgreSQL + Drizzle)

Diez tablas. Todos los ids son `uuid` con `gen_random_uuid()` salvo `activity_events`, que usa
`bigserial` para servir de cursor monótono en el tiempo real. Todas las tablas llevan `created_at` y
`updated_at` (`timestamptz not null default now()`), y `updated_at` se mantiene con un trigger
`set_updated_at()` común.

## Diagrama de relaciones

```
organizations ─┬─< profiles ─────────┬─< training_participants >─┬─ training_sessions
               │                     │                            │
               ├─< training_sessions ─┘                            │
               ├─< llm_settings (1:1)                              │
               └─< activity_events                                 │
                                                                   │
canvases >── training_sessions,  canvases >── profiles (owner)  ◄──┘
   │
   ├─< canvas_modules ─< sticky_notes >── profiles (author)
   └─< canvas_analyses >── profiles (requested_by)
```

## Enums

```sql
create type user_role        as enum ('facilitator', 'participant');
create type session_status   as enum ('draft', 'active', 'closed');
create type participant_status as enum ('invited', 'active', 'disabled');
create type canvas_kind      as enum ('participant', 'facilitator', 'consolidated');
create type canvas_status    as enum ('not_started', 'in_progress', 'completed');
create type module_key       as enum ('customer_segments','value_propositions','channels',
                                      'customer_relationships','revenue_streams','key_resources',
                                      'key_activities','key_partnerships','cost_structure');
create type note_color       as enum ('yellow','blue','teal','pink','green','orange');
create type llm_provider     as enum ('anthropic','openai','ollama');
create type analysis_scope   as enum ('canvas','session');
create type analysis_status  as enum ('pending','completed','failed');
create type theme_key        as enum ('principal','oscuro','creativo');
```

## Tablas

### `organizations`
| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid PK | |
| `name` | text not null | Nombre de la organización |
| `logo_url` | text | Opcional |
| `theme` | theme_key not null default `'principal'` | Tema por defecto de la organización |
| `created_at` / `updated_at` | timestamptz | |

### `profiles`
| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid PK | |
| `organization_id` | uuid FK → organizations `on delete cascade` | |
| `username` | citext not null | Identificador de acceso |
| `email` | citext | Opcional para participantes |
| `full_name` | text not null | |
| `password_hash` | text not null | Argon2id |
| `role` | user_role not null | |
| `is_active` | boolean not null default true | |
| `must_change_password` | boolean not null default false | true tras credencial temporal |
| `last_login_at` | timestamptz | |

Índices: `unique (organization_id, username)`, `unique (organization_id, email) where email is not null`, `index (organization_id, role)`.

### `training_sessions`
| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid PK | |
| `organization_id` | uuid FK → organizations `cascade` | |
| `facilitator_id` | uuid FK → profiles `on delete restrict` | |
| `name` | text not null | |
| `description` | text | |
| `status` | session_status not null default `'draft'` | |
| `starts_at` / `ends_at` | timestamptz | |

Índices: `index (organization_id, status)`.

### `training_participants`
Vincula un `profile` con rol `participant` a una capacitación.

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid PK | |
| `training_session_id` | uuid FK → training_sessions `cascade` | |
| `profile_id` | uuid FK → profiles `cascade` | |
| `status` | participant_status not null default `'invited'` | |
| `temp_password_ciphertext` | text | AES-256-GCM; se borra al primer inicio de sesión |
| `credentials_issued_at` | timestamptz | |
| `last_seen_at` | timestamptz | Marca de presencia para el indicador "en vivo" |

Índices: `unique (training_session_id, profile_id)`, `index (training_session_id, status)`.

### `canvases`
| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid PK | |
| `training_session_id` | uuid FK → training_sessions `cascade` | |
| `owner_id` | uuid FK → profiles `cascade` | null si `kind = 'consolidated'` |
| `kind` | canvas_kind not null | |
| `title` | text not null | |
| `status` | canvas_status not null default `'not_started'` | Derivado y persistido |
| `note_count` | integer not null default 0 | Contador desnormalizado (evita `count(*)` en el monitoreo) |
| `filled_modules` | smallint not null default 0 | Módulos con ≥1 nota → avance = `filled_modules / 9` |
| `content_hash` | text | SHA-256 del contenido normalizado; ver [08](./08-inteligencia-artificial.md) |
| `last_activity_at` | timestamptz not null default now() | |
| `completed_at` | timestamptz | Marcado explícito por el dueño |

Índices: `unique (training_session_id, owner_id, kind)`,
`index (training_session_id, last_activity_at desc)`.

### `canvas_modules`
Instancia de cada uno de los nueve bloques dentro de un lienzo. Se crean juntos al crear el lienzo.

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid PK | |
| `canvas_id` | uuid FK → canvases `cascade` | |
| `module_key` | module_key not null | |
| `order_index` | smallint not null | 1–9, orden metodológico |
| `note_count` | integer not null default 0 | |

Índices: `unique (canvas_id, module_key)`.

### `sticky_notes`
| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid PK | |
| `canvas_id` | uuid FK → canvases `cascade` | Redundante con el módulo, pero permite consultar por lienzo sin join |
| `canvas_module_id` | uuid FK → canvas_modules `cascade` | |
| `module_key` | module_key not null | Copia para lecturas rápidas y para el prompt de IA |
| `author_id` | uuid FK → profiles `on delete set null` | |
| `text` | text not null, `check (char_length(text) <= 500)` | |
| `color` | note_color not null default `'yellow'` | |
| `position_x` | real not null default 0 | Coordenada relativa al módulo (0–1) |
| `position_y` | real not null default 0 | Idem |
| `order_index` | integer not null default 0 | Orden/apilado dentro del módulo |
| `created_at` / `updated_at` | timestamptz | |

Índices: `index (canvas_id, updated_at desc)` (sincronización incremental),
`index (canvas_module_id, order_index)`.

> Las posiciones se guardan **relativas** (0–1) al área del módulo para que el lienzo se vea igual
> en proyector, tablet y móvil, y para que arrastrar una nota a otro módulo sea recalcular la
> fracción, no la coordenada absoluta.

### `llm_settings`
Una fila por organización.

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid PK | |
| `organization_id` | uuid FK → organizations `cascade`, **unique** | |
| `provider` | llm_provider not null default `'anthropic'` | |
| `model` | text not null | p. ej. `claude-sonnet-5` |
| `base_url` | text | Requerido para `ollama` |
| `api_key_ciphertext` | text | AES-256-GCM (iv + tag + datos, base64) |
| `api_key_last4` | text | Para mostrar enmascarado |
| `max_output_tokens` | integer not null default 1500 | Límite máximo de salida |
| `custom_instructions` | text | Instrucciones personalizadas del análisis |
| `is_enabled` | boolean not null default false | |
| `last_tested_at` | timestamptz / `last_test_ok` boolean | Resultado de la prueba de conexión |
| `updated_by` | uuid FK → profiles `set null` | |

### `canvas_analyses`
| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | uuid PK | |
| `scope` | analysis_scope not null | `canvas` o `session` |
| `canvas_id` | uuid FK → canvases `cascade` | null si `scope = 'session'` |
| `training_session_id` | uuid FK → training_sessions `cascade` | |
| `requested_by` | uuid FK → profiles `set null` | |
| `content_hash` | text not null | Clave de reutilización |
| `provider` | llm_provider not null / `model` text not null | Trazabilidad |
| `status` | analysis_status not null default `'pending'` | |
| `result` | jsonb | `{ resumen, fortalezas[], debilidades[], riesgos[], recomendaciones[], puntuacion }` |
| `score` | smallint `check (score between 0 and 100)` | Extraído para ordenar y graficar |
| `input_tokens` / `output_tokens` | integer | Control de costo |
| `error_message` | text | Si `status = 'failed'` |

Índices: `unique (scope, coalesce(canvas_id, training_session_id), content_hash) where status = 'completed'`
(reutilización), `index (canvas_id, created_at desc)` (último análisis).

### `activity_events`
Bitácora y cursor del tiempo real.

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id` | bigserial PK | Cursor monótono |
| `organization_id` | uuid FK `cascade` | |
| `training_session_id` | uuid FK `cascade` | |
| `canvas_id` | uuid FK `cascade` | Opcional |
| `actor_id` | uuid FK → profiles `set null` | |
| `type` | text not null | `note.created`, `note.updated`, `note.moved`, `note.deleted`, `canvas.progress`, `canvas.completed`, `participant.login`, `participant.created`, `participant.disabled`, `analysis.completed` |
| `payload` | jsonb not null default `'{}'` | Datos mínimos: ids y campos cambiados, nunca el lienzo entero |
| `created_at` | timestamptz | |

Índices: `index (training_session_id, id)`, `index (canvas_id, id)`.
Retención: purga de eventos con más de 30 días mediante script (`db:prune`).

## Reglas de consistencia

- `canvases.note_count`, `canvases.filled_modules`, `canvas_modules.note_count` y
  `canvases.last_activity_at` se actualizan en la **misma transacción** que la mutación de la nota,
  desde el servicio. Motivo: el monitoreo lee la cuadrícula de participantes sin agregaciones.
- `canvases.status`: `not_started` con 0 notas, `in_progress` con ≥1, `completed` cuando
  `completed_at is not null` (marcado explícito) o `filled_modules = 9`.
- `content_hash` se recalcula al final de cada mutación de nota, sobre el contenido normalizado del
  lienzo (módulo + texto ordenados, sin ids ni posiciones).
- Crear un participante crea, en la misma transacción: `profiles` + `training_participants` +
  `canvases` (kind `participant`) + sus 9 `canvas_modules`.

## Migraciones y semilla

- `npm run db:generate` genera SQL en `src/db/migrations`; `db:migrate` lo aplica. Sin `push` en
  producción.
- `npm run db:seed` crea: organización de ejemplo, un facilitador (credenciales desde
  `SEED_FACILITATOR_USERNAME` / `SEED_FACILITATOR_PASSWORD`), una capacitación en estado `draft` y
  el lienzo del facilitador con sus nueve módulos.
