# 05 — Pantallas y navegación

## Mapa de rutas

| Ruta | Rol | Pantalla |
| ---- | --- | -------- |
| `/login` | pública | Inicio de sesión |
| `/` | ambos | Redirección según rol |
| `/f` | facilitador | 1. Resumen |
| `/f/monitoreo` | facilitador | 2. Monitoreo en tiempo real |
| `/f/monitoreo/[participantId]` | facilitador | Lienzo de un participante (solo lectura) |
| `/f/lienzo` | facilitador | 3. Lienzo del facilitador |
| `/f/metodologia` | facilitador | 4. Metodología |
| `/f/usuarios` | facilitador | 5. Usuarios |
| `/f/configuracion` | facilitador | 6. Configuración |
| `/presentacion/[canvasId]` | facilitador | Modo presentación (sin shell) |
| `/p/lienzo` | participante | Su Business Model Canvas |
| `/p/metodologia` | participante | Metodología (misma vista, sin acciones de admin) |
| `/p/analisis` | participante | Análisis más reciente e historial propio |

Shell del facilitador: barra lateral con las seis secciones + selector de capacitación + tema +
menú de usuario. En móvil, la barra lateral pasa a `Sheet`. El participante usa un shell reducido
(lienzo, metodología, análisis) con barra inferior en móvil.

---

## 1. Resumen (`/f`)

**Muestra:** nombre de la capacitación · número de participantes · participantes activos (vistos en
los últimos 5 min) · lienzos iniciados · lienzos terminados · actividad reciente · accesos rápidos.

- Cuatro `StatCard` en la parte superior; barra de progreso agregada de la sesión.
- **Actividad reciente:** últimos 20 `activity_events` de la sesión, con avatar, verbo y hora
  relativa; se actualiza por el mismo canal SSE del monitoreo.
- **Accesos rápidos:** "Agregar participantes", "Abrir monitoreo", "Modo presentación",
  "Solicitar análisis general".
- Datos por RSC en la carga inicial; a partir de ahí, deltas por evento.

## 2. Monitoreo en tiempo real (`/f/monitoreo`)

**Por participante:** nombre · estado (`sin iniciar` / `trabajando` / `terminado` / `inactivo`) ·
porcentaje de avance · última modificación · cantidad de post-its · miniatura del lienzo ·
indicador de actividad en vivo (punto pulsante si hubo evento en los últimos 60 s).

- Conmutador **cuadrícula / lista**. Cuadrícula responsiva: 4 col. en desktop, 2 en tablet, 1 en
  móvil.
- Buscar por nombre o usuario; filtrar por estado; ordenar por avance, actividad o nombre.
- Acciones por tarjeta: *Abrir lienzo* (lectura), *Proyectar*, *Analizar*, *Reiniciar contraseña*.
- **Miniatura:** render SVG ligero de los 9 bloques con puntos de color por nota — no es un
  screenshot ni un iframe; se dibuja desde `filled_modules` y el conteo por módulo.
- **Refresco:** suscripción SSE a `/api/stream/session/[id]`; si el navegador o la red no lo
  soportan, `useEventStream` cae a polling de `/api/events?since=` cada 5 s. Los eventos traen solo
  ids y contadores; la tarjeta se actualiza en cliente sin recargar la página.

## 3. Lienzo del facilitador (`/f/lienzo`)

Los nueve módulos en la rejilla tradicional · post-its · arrastrar y soltar entre módulos ·
edición rápida (doble clic o Enter) · eliminar · selector de color · zoom (25–200 %) · ajustar a
pantalla · guardado automático · pantalla completa · botón de modo presentación.

- Barra de herramientas superior: añadir nota, color por defecto, zoom (`-` / `%` / `+`), ajustar,
  pantalla completa, presentar, indicador de guardado ("Guardando…" / "Guardado hace 3 s").
- Cada bloque muestra: número, nombre, icono, explicación breve, botón de ayuda (popover con las
  preguntas orientadoras), contador de notas y área de post-its.
- Atajos: `N` nueva nota en el módulo enfocado, `Supr` eliminar, `Esc` salir de edición,
  `Ctrl/⌘ +` / `-` zoom, `F` pantalla completa.

## 4. Metodología (`/f/metodologia`, `/p/metodologia`)

Vista educativa con: número · nombre · descripción breve · preguntas orientadoras · ejemplo corto ·
navegación anterior/siguiente.

- Dos disposiciones: **recorrido** (una tarjeta grande, paso 1 de 9, con flechas y teclado ←/→) e
  **índice** (los nueve en cuadrícula). El estado del paso vive en la URL (`?modulo=3`) para poder
  proyectarlo o compartirlo.
- Sin párrafos largos: descripción de 1–2 líneas, 4–5 preguntas en lista, 1 ejemplo.
- Botón "Ir a mi lienzo" que abre el módulo correspondiente resaltado.

## 5. Usuarios (`/f/usuarios`)

- **Alta individual:** diálogo con nombre completo, usuario (autogenerado y editable), correo
  opcional y capacitación asignada.
- **Alta masiva:** textarea (un nombre por línea) o pegado desde hoja de cálculo; previsualización
  con usuarios generados y detección de duplicados antes de confirmar.
- **Credenciales:** al crear se muestra un diálogo con usuario y contraseña temporal, botón
  *Copiar* por fila, *Copiar todo* y *Descargar CSV* (`usuario,contraseña,nombre`). Aviso explícito
  de que la contraseña deja de ser recuperable tras el primer inicio de sesión.
- **Tabla:** nombre, usuario, estado, avance, última actividad y menú de acciones: reiniciar
  contraseña, desactivar/activar, reasignar capacitación, eliminar (con confirmación que nombra al
  participante y advierte que se borra su lienzo).
- Búsqueda, filtro por estado y selección múltiple para acciones en lote.

## 6. Configuración (`/f/configuracion`)

Pestañas:

1. **Organización** — nombre de la organización, nombre de la capacitación, logotipo opcional
   (subida a `public/logo` o URL), tema visual por defecto.
2. **Inteligencia artificial** — proveedor (Anthropic / OpenAI / Ollama), modelo, URL base, clave
   API (campo de escritura; muestra `••••1234` si ya existe), botón **Probar conexión** con
   resultado en línea, límite máximo de salida (tokens) e instrucciones personalizadas para el
   análisis.
3. **Apariencia** — selector de tema para la sesión actual del usuario.

La clave API se envía por Server Action, se cifra en el servidor y nunca se devuelve al cliente.

## Modo presentación (`/presentacion/[canvasId]`)

Sin barra lateral ni cabecera. Lienzo a pantalla completa, zoom y ajuste, y un selector flotante
(se oculta tras 3 s de inactividad) para alternar entre **lienzo del facilitador**, **lienzo de un
participante** y **vista consolidada** de la sesión. Pensado para proyector y para compartir
pantalla en Google Meet o Zoom: alto contraste, tipografía mayor y sin animaciones distractoras.
Actualización en vivo por el mismo canal SSE.

## Pantallas del participante

- `/p/lienzo`: idéntico al lienzo del facilitador salvo por *presentar* y *proyectar*; añade el
  botón **Solicitar análisis** y el indicador de guardado automático.
- `/p/analisis`: tarjeta del análisis más reciente (resumen, fortalezas, debilidades, riesgos,
  recomendaciones y puntuación 0–100 con anillo de progreso) e historial colapsado. Si el contenido
  no cambió desde el último análisis, se muestra el existente sin volver a llamar al proveedor.

## Estados vacíos y de error (definidos en Fase 1, implementados en las siguientes)

| Situación | Mensaje |
| --------- | ------- |
| Sin participantes | "Aún no hay participantes. Agrega el primero para comenzar." + CTA |
| Lienzo sin notas | Módulos con marca de agua y sugerencia "Empieza por Segmentos de mercado". |
| IA sin configurar | "Configura un proveedor de IA para habilitar el análisis." (solo facilitador) |
| Sin conexión en vivo | Chip "Reconectando…" y paso automático a polling |
| Credencial desactivada | "Tu acceso fue desactivado. Contacta al facilitador." |
