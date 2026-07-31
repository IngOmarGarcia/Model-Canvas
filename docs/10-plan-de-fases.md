# 10 — Plan de fases

Cada fase termina con un estado ejecutable y verificable. No se avanza sin confirmación explícita.

---

## FASE 1 — Planeación y estructura ✅

**Entregables**
- Documentación completa en `docs/` (visión, arquitectura, metodología, roles, datos, pantallas,
  temas, tiempo real, IA, seguridad, plan).
- Contenido metodológico de los nueve módulos definido y listo para codificar.
- Esquema de base de datos especificado con tablas, enums, relaciones e índices.
- Estructura de carpetas y convenciones acordadas.
- `.env.example` con el contrato de variables de entorno.

**Criterio de aceptación:** cualquier persona puede leer `docs/` y saber qué construir en la Fase 2
sin hacer preguntas de diseño.

---

## FASE 2 — Base del proyecto ✅

**Entregables**
- Proyecto Next.js + TypeScript + Tailwind + shadcn/ui inicializado, con ESLint y `typecheck`.
- `docker-compose.yml` con PostgreSQL 16 y volumen persistente; `DATABASE_URL` desde `.env`.
- Drizzle: esquema completo en `src/db/schema`, primera migración generada y aplicada, `db:seed`
  funcionando (organización, facilitador, capacitación, lienzo del facilitador).
- Auth.js con credenciales, JWT, `requireRole()`, middleware de rutas, pantalla `/login` y cambio de
  contraseña obligatorio.
- Los tres temas en `globals.css` + `ThemeProvider` sin parpadeo + selector de tema.
- Shell del facilitador y del participante con navegación y las pantallas vacías creadas.
- `src/lib/bmc/modules.ts` con los nueve módulos del documento 02.

**Criterio de aceptación:** `npm run db:up && npm run db:migrate && npm run db:seed && npm run dev`
levanta la aplicación; el facilitador semilla inicia sesión, ve el shell, cambia de tema, y un
participante creado a mano puede iniciar sesión y ser redirigido a su lienzo vacío.

**Desviaciones respecto a lo planeado en la Fase 1**

- `profiles.username` / `email` usan `text` con índice único, no `citext`: la aplicación normaliza a
  minúsculas al escribir. Evita depender de una extensión en el servidor de base de datos.
- El índice único de reutilización de análisis cubre el alcance `canvas`; para el alcance `session`
  (con `canvas_id` nulo) la deduplicación la garantiza el servicio en la Fase 5.
- La vista de **Metodología** se adelantó de la Fase 3, porque solo depende de datos estáticos y
  vuelve utilizable la Fase 2. La Fase 3 conserva el resto del alcance del lienzo.
- `updated_at` se mantiene desde la aplicación con `$onUpdate` de Drizzle en lugar de un trigger SQL.

---

## FASE 3 — Canvas interactivo ✅

**Entregables**
- Rejilla BMC responsiva (5×3 → 2 col. → 1 col.) con número, nombre, icono, explicación, botón de
  ayuda, contador de notas y área de post-its.
- Post-its: crear, editar en línea, eliminar, cambiar color, arrastrar dentro y entre módulos
  (dnd-kit), reordenar.
- Guardado automático con escritura optimista, debounce y coalescencia; indicador de estado.
- Zoom, ajustar a pantalla, pantalla completa y atajos de teclado.
- Server Actions de notas con Zod y autorización por propiedad; contadores y `content_hash`
  actualizados transaccionalmente.
- Vista de Metodología (recorrido + índice) para ambos roles.

**Criterio de aceptación:** un participante completa los nueve módulos, recarga la página y todo
persiste con posiciones y colores intactos; el avance calculado es correcto.

**Decisiones tomadas durante la fase**

- **Un solo render de los nueve bloques.** La adaptación a tablet y móvil se hace con CSS
  (`--gc` / `--gr` que solo aplican en `lg`), no renderizando dos árboles distintos: duplicar el DOM
  habría repetido los ids de dnd-kit y roto el arrastre.
- **Zoom compatible con dnd-kit.** Las posiciones se calculan a partir de rectángulos de pantalla,
  cuya proporción es invariante a la escala; el desplazamiento visual de la nota sí se divide por la
  escala para que siga al puntero.
- **Sin `revalidatePath` en las acciones de notas:** un refresco del servidor pisaría el estado
  optimista del cliente. La sincronización del facilitador irá por eventos (Fase 4).
- **Peticiones encadenadas por nota**, de modo que dos cambios sobre el mismo post-it no puedan
  llegar desordenados; el texto además va con debounce de 600 ms.
- **El color no altera el hash de contenido**, sí la última actividad: recolorar no debe invalidar
  un análisis de IA.

---

## FASE 4 — Panel del facilitador ✅

**Entregables**
- Resumen con métricas, actividad reciente y accesos rápidos.
- Monitoreo en cuadrícula/lista con búsqueda, filtros, miniatura, avance e indicador en vivo.
- Canal SSE + respaldo de polling (`useLiveEvents`), presencia y publicación de `activity_events`.
- Lienzo de participante en modo lectura.
- Usuarios: alta individual y masiva, credenciales temporales, copiar, CSV, reiniciar contraseña,
  desactivar, eliminar, reasignar.
- Modo presentación con conmutación entre lienzo del facilitador, de participante y consolidado.

**Criterio de aceptación:** con dos navegadores abiertos, un cambio del participante aparece en el
monitoreo del facilitador en menos de 3 segundos, y el modo presentación se proyecta legible a
1920×1080.

**Dos bugs encontrados y corregidos durante la fase**

- **El middleware trataba `/presentacion` como área de participante.** `pathname.startsWith('/p')`
  también captura `/presentacion`, así que el facilitador era expulsado de su propio modo
  presentación. Ahora la comprobación es por segmento (`=== '/p'` o empieza por `'/p/'`).
- **El script anti-parpadeo del tema leía una clave inservible.** `ThemeScript` es un componente de
  servidor e importaba `THEME_STORAGE_KEY` desde `theme-provider.tsx`, que es `'use client'`: el
  servidor recibía una referencia de cliente y el script generado quedaba con
  `localStorage.getItem('function(){throw Error(...)}')`. Las constantes se movieron a
  `src/lib/theme.ts`, un módulo neutral.

**Decisiones de la fase**

- **Miniatura como SVG dibujado desde contadores**, no captura ni iframe: cuesta lo mismo con 40
  participantes que con uno y se actualiza con los datos que ya trae el evento.
- **El sondeo del SSE vive en el servidor**, no en el navegador: una conexión por pestaña en lugar
  de N peticiones. `Last-Event-ID` sirve de cursor, así que reconectar no pierde eventos.
- **Un recurso ajeno responde 404, nunca 403**, para no confirmar que existe.
- **Las altas masivas se procesan en serie**: cada una necesita ver los usuarios ya asignados para
  resolver colisiones de nombre.

---

## FASE 5 — Inteligencia artificial ✅

**Entregables**
- Configuración: proveedor, modelo, URL base, clave cifrada, prueba de conexión, límite de salida e
  instrucciones personalizadas.
- Abstracción `LlmProvider` con Anthropic, OpenAI y Ollama remoto.
- Análisis individual y de sesión con validación Zod, persistencia y `activity_event`.
- Caché por `content_hash` y rate limit por usuario; registro de tokens.
- Pantalla de análisis del participante y panel de análisis del facilitador.

**Criterio de aceptación:** con una clave válida se obtiene un análisis JSON válido; repetir sin
cambios devuelve el análisis en caché sin consumir cuota; una clave inválida muestra un error
comprensible sin filtrar la clave.

**Bug encontrado y corregido durante la fase**

- **"Forzar uno nuevo" fallaba con 500.** El índice único de reutilización solo admite un análisis
  `completed` por (alcance, objetivo, hash), así que completar uno nuevo con el mismo contenido lo
  violaba. Ahora, al forzar, el análisis vigente de esa clave se retira dentro de la misma
  transacción en la que se completa el nuevo: el índice sigue garantizando la deduplicación.

**Decisiones de la fase**

- **La cuota se evalúa después de consultar la caché**, no antes: un análisis reutilizado no debe
  gastar cuota ni llamar al proveedor.
- **La fila `pending` se crea antes de llamar al proveedor** y se marca `failed` si algo sale mal,
  de modo que un fallo queda registrado con su motivo en vez de desaparecer.
- **Los errores del proveedor se traducen siempre.** El cuerpo crudo puede contener fragmentos de la
  clave, así que nunca se propaga: se verificó con un proveedor simulado que devuelve la clave en el
  mensaje de error.
- **El alcance `session` anonimiza** los lienzos como "Participante 1", "Participante 2": el modelo
  no recibe nombres ni correos.
- **La prueba de conexión no usa modo JSON**, solo confirma clave, modelo y alcance de red.

---

## FASE 6 — Revisión final ✅

**Entregables**
- Repaso responsivo en desktop, tablet y móvil, incluido el lienzo en una columna.
- Lista de verificación de seguridad del documento 09 completada.
- Estados vacíos, de carga y de error en todas las pantallas.
- Accesibilidad: foco, contraste en los tres temas, navegación por teclado en el lienzo.
- README de despliegue (`DATABASE_URL`, migraciones, semilla, variables) y guía rápida para el
  facilitador.
- Datos de demostración opcionales para ensayar la capacitación.

**Criterio de aceptación:** una capacitación de prueba con 10 participantes simulados se ejecuta de
principio a fin sin errores en consola ni en el servidor.

**Hueco encontrado y cerrado**

- **El límite de intentos de inicio de sesión nunca se había implementado**, pese a estar prometido
  en el documento 09 desde la Fase 1. Se añadió la tabla `login_attempts` (migración `0001`), el
  servicio correspondiente y su comprobación dentro de `authorize()`, antes de gastar Argon2.

**Incidencia de herramientas durante la fase**

- `drizzle-kit migrate` se quedó colgado y su tabla de control (`drizzle.__drizzle_migrations`)
  estaba vacía, por lo que intentaba reaplicar la migración `0000` sobre tablas ya existentes. Se
  aplicó el SQL de `0001` directamente y se reconciliaron los dos registros con su hash real. Antes
  de la próxima migración conviene comprobar que `select count(*) from drizzle.__drizzle_migrations`
  devuelva 2.

**Lo que NO se pudo verificar automáticamente**

Todo lo que exige un navegador real con puntero y pantalla:

- Arrastrar y soltar post-its con el ratón, y el comportamiento del zoom durante el arrastre.
- La medición real de contraste de color en los tres temas (los valores en oklch se eligieron para
  cumplir, pero no se midieron con una herramienta).
- El aspecto en proyector a 1920×1080 y en dispositivos táctiles reales.
- Dos navegadores simultáneos comprobando la latencia de propagación por SSE.

---

## Riesgos y decisiones abiertas

| Tema | Situación | Cuándo se resuelve |
| ---- | --------- | ------------------ |
| PDF metodológico | `Generacion de modelos de negocio-Guille.pdf` no se localizó en el equipo. El documento 02 se redactó desde el marco Osterwalder & Pigneur. | Al recibir el archivo, se contrasta y ajusta el documento 02. |
| Escalado del SSE | Cada conexión sondea la base de datos. | Fase 4; se mide y, si hace falta, se pasa a publicador/suscriptor en memoria o `LISTEN/NOTIFY`. |
| Contraseña temporal cifrada reversible | Compromiso aceptado y acotado (ver doc 09). | Confirmar en Fase 4; alternativa es mostrarla una sola vez y no guardarla. |
| Exportar lienzo a PDF/PNG | Fuera de alcance v1. | Se evalúa tras la Fase 6. |
| Lienzo consolidado | Definido como agregación de lecturas de todos los lienzos de la sesión. | Fase 4. |
