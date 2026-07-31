# 11 — Despliegue

La aplicación no depende de `localhost`: todo se resuelve por variables de entorno. Funciona en
cualquier host que ejecute Node 20+ y alcance una base PostgreSQL 16.

## Variables obligatorias

| Variable | Valor | Nota |
| -------- | ----- | ---- |
| `DATABASE_URL` | `postgresql://usuario:clave@host:5432/base` | Con `?sslmode=require` en proveedores administrados |
| `AUTH_SECRET` | `openssl rand -base64 32` | Distinto del de desarrollo |
| `AUTH_URL` | `https://tu-dominio` | URL pública real |
| `AUTH_TRUST_HOST` | `true` | Necesario detrás de proxy |
| `APP_ENCRYPTION_KEY` | `openssl rand -base64 32` | 32 bytes exactos. **Si se pierde, las claves de IA guardadas dejan de poder descifrarse.** |

Opcionales: `NEXT_PUBLIC_IMAGE_DOMAINS` (logotipos remotos, separados por coma) y
`SERVER_ACTIONS_ALLOWED_ORIGINS` (orígenes permitidos detrás de proxy).

Las variables `SEED_*` solo hacen falta durante la siembra inicial; quítalas después.

## Pasos

```bash
# 1. Dependencias y compilación
npm ci
npm run build

# 2. Esquema de base de datos
npm run db:migrate

# 3. Cuenta inicial del facilitador (una sola vez)
SEED_FACILITATOR_USERNAME=facilitador \
SEED_FACILITATOR_PASSWORD='una-contraseña-fuerte' \
npm run db:seed

# 4. Arranque
npm run start        # escucha en $PORT (3000 por defecto)
```

Cambia la contraseña del facilitador desde la aplicación en cuanto entres, y borra
`SEED_FACILITATOR_PASSWORD` del entorno.

## Comportamiento detrás de proxy inverso

- **No hagas búfer del SSE.** La ruta `/api/stream/session/*` ya envía
  `X-Accel-Buffering: no`, pero nginx u otros proxies pueden necesitar
  `proxy_buffering off;` para esa ubicación. Sin eso el monitoreo cae a polling: funciona, pero con
  más latencia.
- Deja pasar `x-forwarded-for`: es lo que usa el límite de intentos de inicio de sesión para
  identificar la IP de origen.
- Tiempo de espera de lectura de al menos 5 minutos en la ruta de SSE.

## Despliegue sin estado (serverless)

El diseño lo admite: la sesión es un JWT en cookie, no hay tabla de sesiones y el canal en vivo
reconecta con cursor. Ten en cuenta que:

- Las conexiones SSE tienen duración máxima; el cliente reconecta solo con `Last-Event-ID` y no
  pierde eventos.
- `maxDuration` está en 300 s para el SSE y 120 s para el análisis. Ajusta si tu plataforma impone
  menos.
- El pool de Postgres es por instancia. Con muchas instancias, usa un pooler (PgBouncer o el que
  ofrezca tu proveedor).

## Copias de seguridad

Lo mínimo a respaldar es la base de datos completa. Ten presente que
`llm_settings.api_key_ciphertext` y `training_participants.temp_password_ciphertext` están cifrados
con `APP_ENCRYPTION_KEY`: **un respaldo sin esa clave no permite recuperarlos**. Guarda la clave
aparte, en un gestor de secretos.

## Purga de datos

`activity_events` crece con la actividad. Conviene borrar lo anterior a 30 días:

```sql
delete from activity_events where created_at < now() - interval '30 days';
```

## Actualizaciones

```bash
git pull
npm ci
npm run db:migrate    # aplica solo las migraciones nuevas
npm run build
# reinicia el proceso
```

> Nunca ejecutes `npm run dev` contra un `.next` que esté sirviendo `npm run start`: el build de
> desarrollo lo sobrescribe y los formularios empiezan a responder 400. Ver la sección de solución
> de problemas del README.
