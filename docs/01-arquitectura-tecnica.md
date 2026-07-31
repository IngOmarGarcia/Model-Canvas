# 01 — Arquitectura técnica

## Stack y decisiones

| Área | Elección | Motivo |
| ---- | -------- | ------ |
| Framework | **Next.js 15+ (App Router)** con React Server Components | Server Actions para mutaciones, streaming, y route handlers para SSE. |
| Lenguaje | **TypeScript** en modo `strict` | Contratos compartidos entre servidor y cliente. |
| Estilos | **Tailwind CSS v4** + variables CSS | Temas conmutables sin recompilar. |
| Componentes | **shadcn/ui** (Radix) | Accesibles, editables en el repo, consistentes con los tokens. |
| Base de datos | **PostgreSQL 16 en Docker** | Reproducible en local y equivalente en producción. |
| ORM | **Drizzle ORM** + `drizzle-kit` | Esquema tipado en TS, migraciones SQL versionadas y legibles. |
| Autenticación | **Auth.js / NextAuth v5**, provider `Credentials`, estrategia **JWT** en cookie `httpOnly` | Sin tabla de sesiones, funciona en edge y en despliegues sin estado. |
| Tiempo real | **SSE** (`text/event-stream`) sobre un cursor de `activity_events`, con **polling incremental** de respaldo | Unidireccional basta: el servidor notifica cambios, las mutaciones van por Server Actions. |
| Drag & drop | **dnd-kit** (`core`, `modifiers`, `sortable`) | Soporte táctil y de teclado, sin dependencia de HTML5 DnD. |
| Validación | **Zod** | Un esquema por acción, reutilizado en React Hook Form y en el servidor. |
| Formularios | **React Hook Form** + `@hookform/resolvers` | Menos renders, integración directa con Zod. |
| Notificaciones | **sonner** | Feedback de guardado, errores y copiado de credenciales. |

**Regla transversal:** ninguna URL de servicio se codifica en el código. `DATABASE_URL`,
`AUTH_URL`, `LLM_BASE_URL`, etc. provienen del entorno.

## Capas

```
Cliente (RSC + componentes cliente)
        │  Server Actions (mutaciones)      │  fetch/EventSource (lectura en vivo)
        ▼                                    ▼
src/server/actions/*        ──────►  src/app/api/**  (SSE, análisis, prueba de conexión)
        │  valida con Zod, autoriza con sesión
        ▼
src/server/services/*   (reglas de negocio: canvas, notas, participantes, análisis)
        │
        ▼
src/db/*  (Drizzle: esquema, consultas)  ──►  PostgreSQL
                                              ▲
src/server/llm/*  (proveedores IA) ───────────┘ (guarda análisis y hash)
```

- **Server Actions** para todo lo que muta estado (crear nota, mover, editar, alta de usuarios,
  guardar configuración). Cada acción: `auth() → Zod.parse → autorización → servicio → revalidate`.
- **Route Handlers** solo donde hace falta streaming o control de respuesta: SSE, solicitud de
  análisis (respuesta larga), prueba de conexión con el proveedor, descarga de CSV.
- **Servicios** sin dependencia de `next/headers`: reciben el actor ya resuelto. Testeables.
- **Acceso a datos** exclusivamente vía Drizzle desde el servidor. El cliente jamás ve la conexión.

## Estructura de carpetas planificada

```
canvas/
├─ docker-compose.yml            # postgres:16 + volumen persistente
├─ drizzle.config.ts
├─ next.config.ts
├─ components.json               # shadcn/ui
├─ .env.example
├─ docs/                         # esta documentación
├─ public/
│  └─ logo/                      # logotipo por defecto de la organización
└─ src/
   ├─ app/
   │  ├─ layout.tsx              # ThemeProvider + fuentes + Toaster
   │  ├─ page.tsx                # redirección por rol
   │  ├─ globals.css             # tokens y los 3 temas
   │  ├─ (auth)/
   │  │  └─ login/page.tsx
   │  ├─ (facilitator)/f/
   │  │  ├─ layout.tsx           # shell con sidebar; guard de rol
   │  │  ├─ page.tsx             # 1. Resumen
   │  │  ├─ monitoreo/page.tsx   # 2. Monitoreo en tiempo real
   │  │  ├─ monitoreo/[participantId]/page.tsx   # lienzo en modo lectura
   │  │  ├─ lienzo/page.tsx      # 3. Lienzo del facilitador
   │  │  ├─ metodologia/page.tsx # 4. Metodología
   │  │  ├─ usuarios/page.tsx    # 5. Usuarios
   │  │  └─ configuracion/page.tsx # 6. Configuración
   │  ├─ (participant)/p/
   │  │  ├─ layout.tsx
   │  │  ├─ lienzo/page.tsx
   │  │  ├─ metodologia/page.tsx
   │  │  └─ analisis/page.tsx
   │  ├─ presentacion/[canvasId]/page.tsx        # modo presentación, sin shell
   │  └─ api/
   │     ├─ auth/[...nextauth]/route.ts
   │     ├─ stream/session/[sessionId]/route.ts  # SSE facilitador
   │     ├─ stream/canvas/[canvasId]/route.ts    # SSE lienzo puntual
   │     ├─ events/route.ts                      # polling incremental (?since=)
   │     ├─ analysis/route.ts                    # POST solicitar análisis
   │     ├─ llm/test/route.ts                    # POST prueba de conexión
   │     └─ participants/export/route.ts         # GET CSV de credenciales
   ├─ components/
   │  ├─ ui/                     # shadcn/ui
   │  ├─ layout/                 # app-shell, sidebar, topbar, user-menu
   │  ├─ theme/                  # theme-provider, theme-switcher
   │  ├─ canvas/                 # canvas-board, module-block, sticky-note, toolbar, zoom
   │  ├─ facilitator/            # stats-cards, participant-grid, canvas-thumbnail, live-badge
   │  ├─ users/                  # user-form, bulk-form, credentials-dialog
   │  ├─ methodology/            # module-card, module-navigator
   │  └─ analysis/               # analysis-panel, score-ring
   ├─ db/
   │  ├─ index.ts                # cliente Drizzle (pool desde DATABASE_URL)
   │  ├─ schema/                 # un archivo por dominio + index.ts
   │  ├─ migrations/             # SQL generado por drizzle-kit
   │  └─ seed.ts                 # organización, facilitador y módulos base
   ├─ lib/
   │  ├─ bmc/modules.ts          # los 9 módulos (fuente única de verdad)
   │  ├─ bmc/layout.ts           # geometría del lienzo tradicional
   │  ├─ validation/             # esquemas Zod por dominio
   │  ├─ crypto.ts               # AES-256-GCM para claves de IA
   │  ├─ password.ts             # hash argon2/bcrypt + generador de credenciales
   │  ├─ hash.ts                 # hash de contenido del lienzo
   │  ├─ rate-limit.ts
   │  ├─ colors.ts               # paleta de post-its
   │  └─ utils.ts                # cn(), formateo de fechas
   ├─ server/
   │  ├─ auth.ts                 # configuración Auth.js + helpers requireRole()
   │  ├─ actions/                # Server Actions por dominio
   │  ├─ services/               # canvas, notes, participants, sessions, analysis
   │  ├─ events/                 # publicación y suscripción de eventos
   │  └─ llm/
   │     ├─ types.ts             # interfaz común LlmProvider
   │     ├─ anthropic.ts | openai.ts | ollama.ts
   │     └─ index.ts             # factoría por configuración
   └─ types/
```

## Convenciones

- Rutas y carpetas de UI en español (coinciden con el idioma del producto); código, tipos y tablas
  en inglés.
- Toda Server Action devuelve `ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?… }`.
  Nunca lanza al cliente errores internos.
- Los ids son `uuid` generados en base de datos (`gen_random_uuid()`), salvo `activity_events` que
  usa `bigserial` para servir de cursor monótono.
- Fechas siempre `timestamptz`, generadas por la base (`now()`), nunca por el cliente.
- Los módulos del BMC se identifican por `module_key` estable (`customer_segments`, …), no por
  posición: el orden vive en `lib/bmc/modules.ts`.
- `npm run` como gestor de scripts: `dev`, `build`, `lint`, `typecheck`, `db:up`, `db:generate`,
  `db:migrate`, `db:seed`.
