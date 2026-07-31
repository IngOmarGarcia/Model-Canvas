# Canvas BMC — Plataforma de capacitación en Business Model Canvas

Aplicación web para impartir capacitaciones sobre el **Business Model Canvas** (metodología de
Osterwalder & Pigneur). Un **facilitador** administra la sesión y observa en tiempo real; cada
**participante** completa su propio lienzo con notas tipo post-it y puede solicitar análisis
asistido por inteligencia artificial.

## Estado del proyecto

| Fase | Nombre | Estado |
| ---- | ------ | ------ |
| 1 | Planeación y estructura | ✅ Completada |
| 2 | Base del proyecto (scaffold, DB, auth, temas) | ✅ Completada |
| 3 | Canvas interactivo (post-its, dnd-kit, autosave) | ✅ Completada |
| 4 | Panel del facilitador (monitoreo, usuarios, presentación) | ✅ Completada |
| 5 | Inteligencia artificial (proveedores, análisis, caché) | ✅ Completada |
| 6 | Revisión final (responsive, seguridad, QA) | ✅ Completada |

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · PostgreSQL en Docker · Drizzle ORM ·
Auth.js (NextAuth v5, credenciales + JWT) · SSE con respaldo de polling · dnd-kit · Zod ·
React Hook Form.

## Documentación de la Fase 1

Toda la planeación vive en [`docs/`](./docs):

| Documento | Contenido |
| --------- | --------- |
| [00 — Visión y alcance](./docs/00-vision-y-alcance.md) | Objetivo, actores, alcance dentro/fuera, glosario |
| [01 — Arquitectura técnica](./docs/01-arquitectura-tecnica.md) | Stack, capas, estructura de carpetas, convenciones |
| [02 — Metodología BMC](./docs/02-metodologia-bmc.md) | Los 9 módulos: descripción, preguntas guía, ejemplos |
| [03 — Roles y permisos](./docs/03-roles-y-permisos.md) | Matriz de permisos y reglas de autorización |
| [04 — Modelo de datos](./docs/04-modelo-de-datos.md) | Tablas, relaciones, índices, enums |
| [05 — Pantallas y navegación](./docs/05-pantallas-y-navegacion.md) | Rutas, cada pantalla y sus componentes |
| [06 — Sistema de diseño y temas](./docs/06-sistema-de-diseno-y-temas.md) | Tokens CSS, 3 temas, colores de post-it |
| [07 — Tiempo real](./docs/07-tiempo-real.md) | SSE, cursor de eventos, respaldo por polling |
| [08 — Inteligencia artificial](./docs/08-inteligencia-artificial.md) | Abstracción de proveedores, contrato JSON, caché por hash |
| [09 — Seguridad](./docs/09-seguridad.md) | Autenticación, cifrado de claves, validación, rate limit |
| [10 — Plan de fases](./docs/10-plan-de-fases.md) | Entregables y criterios de aceptación por fase |
| [11 — Despliegue](./docs/11-despliegue.md) | Variables, pasos, proxy inverso, respaldos |
| [12 — Guía del facilitador](./docs/12-guia-del-facilitador.md) | Cómo dar una sesión, paso a paso |

## Puesta en marcha

Requisitos: Node.js 20+, npm y Docker Desktop en ejecución.

```bash
npm install            # instala dependencias
npm run db:up          # levanta PostgreSQL 16 en Docker
npm run db:generate    # genera la migración SQL desde el esquema Drizzle
npm run db:migrate     # aplica la migración
npm run db:seed        # crea organización, facilitador, capacitación y su lienzo
npm run dev            # http://localhost:3000
```

Credenciales del facilitador sembrado: usuario `facilitador`, contraseña la de
`SEED_FACILITATOR_PASSWORD` en `.env.local`.

Otros scripts: `npm run typecheck`, `npm run lint`, `npm run db:studio` (Drizzle Studio),
`npm run db:down` (detiene Postgres).

**Datos de demostración** — `npm run db:demo` crea cuatro participantes con distinto avance
(completo, medio, apenas iniciado y sin empezar) para ensayar el monitoreo sin dar de alta a nadie.
Contraseña de todos: `Demo2026!`. Se quitan con `npm run db:demo:clean`.

Para desplegar, ver [docs/11 — Despliegue](./docs/11-despliegue.md). Para dar una sesión, ver
[docs/12 — Guía del facilitador](./docs/12-guia-del-facilitador.md).

## Solución de problemas

**HTTP 400 al enviar el formulario de inicio de sesión (o cualquier otro formulario).**
Es un desajuste de build, no un problema de credenciales. Los formularios usan Server Actions, cuyos
identificadores se generan en cada build; si el `.next` que sirve el servidor deja de corresponder al
que cargó el navegador, la acción no se resuelve y Next responde 400. Suele pasar al ejecutar
`npm run dev` mientras `npm run start` sigue vivo: el build de desarrollo sobrescribe `.next` y el
servidor de producción queda sirviendo un build que ya no existe en disco.

Cómo salir:

```bash
# 1. Deja un solo servidor corriendo (dev o start, nunca los dos a la vez)
# 2. Reconstruye desde limpio
rm -rf .next && npm run build && npm run start
# 3. Recarga el navegador con Ctrl+Shift+R: la pestaña abierta todavía
#    apunta a los identificadores de acción del build anterior
```

Señal para reconocerlo: `.next/BUILD_ID` no existe pero `next start` sigue respondiendo, y las
rutas `/api/*` funcionan mientras los formularios devuelven 400.

**El inicio de sesión falla o la aplicación no carga datos.** Comprueba que el contenedor esté
arriba con `docker ps`; si aparece como `Exited`, ejecuta `npm run db:up`.

## Variables de entorno

Ver [`.env.example`](./.env.example). `.env.local` ya trae valores de **desarrollo**; regenera
`AUTH_SECRET` y `APP_ENCRYPTION_KEY` con `openssl rand -base64 32` antes de desplegar.

La aplicación no depende de `localhost`: la conexión a base de datos se resuelve por `DATABASE_URL`
y los proveedores externos por variables de entorno.

## Fuente metodológica

Contenido conceptual basado en *Generación de modelos de negocio* (Alexander Osterwalder & Yves
Pigneur). Las descripciones, preguntas y ejemplos del proyecto son redacción propia y resumida con
fines de capacitación; no se reproducen textos extensos de la obra.
