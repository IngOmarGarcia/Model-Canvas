# 07 — Sincronización en tiempo real

## Principio

El servidor **notifica**, el cliente **consulta lo mínimo**. Las mutaciones viajan por Server
Actions; el canal en vivo solo transporta eventos pequeños con ids y contadores. Nunca se envía el
lienzo completo por el canal.

## Modelo de eventos

Cada mutación relevante escribe una fila en `activity_events` dentro de la misma transacción que el
cambio. El `id` (`bigserial`) es el **cursor**: cliente y servidor solo intercambian "dame lo que
haya después de N".

```jsonc
// evento tal como llega al cliente
{
  "id": 4821,
  "type": "note.moved",
  "canvasId": "…",
  "actorId": "…",
  "at": "2026-07-30T18:04:11.320Z",
  "payload": { "noteId": "…", "from": "channels", "to": "customer_relationships" }
}
```

Tipos: `note.created` · `note.updated` · `note.moved` · `note.deleted` · `canvas.progress` ·
`canvas.completed` · `participant.login` · `participant.created` · `participant.disabled` ·
`analysis.completed`.

## Transporte 1: SSE (preferido)

`GET /api/stream/session/[sessionId]?since=<cursor>` y `GET /api/stream/canvas/[canvasId]?since=<cursor>`
devuelven `text/event-stream` con `Cache-Control: no-store` y `X-Accel-Buffering: no`.

- El handler autoriza (sesión + pertenencia a la organización/capacitación) **antes** de abrir el
  flujo.
- Bucle: consulta eventos con `id > cursor` cada 1.5 s dentro del handler, los emite y actualiza el
  cursor. Sondeo del lado del servidor, no del navegador: un solo `EventSource` por pestaña en vez
  de N peticiones.
- `:keep-alive` cada 20 s para atravesar proxies.
- `retry: 3000` en el flujo; `EventSource` reconecta solo y reenvía `Last-Event-ID`, que el handler
  usa como cursor para no perder eventos durante la caída.
- Cierre limpio con `request.signal` (abort) para no dejar conexiones colgadas.
- Runtime Node.js (no edge) por el pool de Postgres. `dynamic = 'force-dynamic'`,
  `maxDuration` acotado; al expirar, el cliente reconecta con su último cursor.

## Transporte 2: polling incremental (respaldo)

`GET /api/events?sessionId=…&since=<cursor>&limit=100` devuelve el mismo formato en JSON.

Se activa cuando: `EventSource` no existe, la conexión falla dos veces seguidas, o la pestaña
detecta un entorno que rompe el streaming (algunos proxies corporativos). Intervalo adaptativo:
5 s con la pestaña visible y actividad reciente, 15 s sin actividad, pausado con
`document.hidden` (se recupera al volver con una sola llamada `since=`).

Un mismo hook, `useLiveEvents(scope, { since })`, encapsula ambos transportes y expone
`{ events, status: 'live' | 'polling' | 'reconnecting' | 'offline' }`. La UI muestra ese estado en
un chip; ninguna pantalla asume que el canal está vivo.

## Consumo en el cliente

- **Monitoreo:** el estado inicial llega por RSC. Cada evento aplica un parche sobre la tarjeta del
  participante (avance, conteo, última actividad, punto "en vivo"). Los eventos se agrupan por
  `canvasId` en ventanas de 500 ms para no re-renderizar en ráfagas.
- **Lienzo en modo lectura y presentación:** un evento de nota dispara una recarga **incremental**
  del lienzo (`GET` de notas con `updated_at > lastSync`), no del lienzo completo.
- **Lienzo propio:** no consume eventos externos; su fuente de verdad es el estado local optimista.

## Escritura optimista y guardado automático

1. La UI aplica el cambio de inmediato (crear, editar, mover, recolorar).
2. **Texto:** debounce de 600 ms tras la última tecla; se envía el valor final.
3. **Posición:** solo se persiste al soltar (`onDragEnd`); durante el arrastre no hay red. Si el
   usuario mueve varias notas seguidas, se agrupan en un lote de hasta 300 ms.
4. Las peticiones por nota se **coalescen**: si hay una en vuelo para la misma nota, la siguiente la
   reemplaza en cola en vez de encolarse.
5. Error → se revierte al valor previo, se avisa con un toast y la nota queda marcada como "sin
   guardar" con reintento manual.
6. Indicador global: "Guardando…" / "Guardado hace N s" / "Sin conexión — los cambios se
   reintentarán".

## Presencia

`training_participants.last_seen_at` se actualiza como máximo una vez por minuto (latido enviado
por el cliente y también al abrir la conexión SSE). "Activo" = visto en los últimos 5 minutos.
"En vivo" en la tarjeta = evento propio en los últimos 60 segundos.

## Límites conocidos

- Cada conexión SSE consulta la base de datos; con muchos facilitadores conectados el sondeo
  interno crece. Mitigación prevista si hiciera falta: un único intervalo compartido por proceso que
  alimenta a todos los suscriptores de la misma sesión (patrón publicador/suscriptor en memoria), y
  `LISTEN/NOTIFY` de Postgres como paso siguiente. Se documenta ahora; se implementa solo si el
  volumen de la capacitación lo exige.
- En despliegues serverless las conexiones tienen duración máxima: el diseño ya asume reconexión
  con cursor, así que el corte es transparente.
