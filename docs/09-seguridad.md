# 09 — Seguridad

## Autenticación

- **Auth.js (NextAuth v5)** con provider `Credentials` y estrategia **JWT**. La sesión viaja en
  cookie `httpOnly`, `secure` (en producción), `sameSite=lax`, firmada con `AUTH_SECRET`.
- El JWT contiene solo `sub`, `role`, `organizationId`, `trainingSessionId` y `mustChangePassword`.
  Nada sensible.
- El callback `session` verifica en cada petición que el perfil siga `is_active`; una cuenta
  desactivada pierde el acceso sin esperar a que expire el token.
- Duración de sesión: 12 h (una jornada de capacitación), con rotación al renovar.
- `must_change_password = true` fuerza redirección a `/cambiar-contrasena` desde cualquier ruta.

## Contraseñas y credenciales temporales

- Hash con **Argon2id** (parámetros por defecto de `@node-rs/argon2`). Nunca bcrypt con costo bajo,
  nunca hashes sin sal.
- Generador de credenciales: usuario derivado del nombre (`nombre.apellido`, con sufijo numérico si
  colisiona) y contraseña de **10 caracteres** de un alfabeto sin ambigüedades
  (`23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz`), generada con `crypto.randomInt`.
- El texto en claro se cifra (AES-256-GCM) y se guarda en
  `training_participants.temp_password_ciphertext` **únicamente** para permitir copiar/descargar la
  credencial mientras no se use. Se borra en el primer inicio de sesión exitoso.
  *Compromiso consciente:* poder reimprimir credenciales antes de la sesión vale más que la
  garantía de que jamás exista el texto en claro; el descifrado es exclusivo del servidor y solo
  para el facilitador dueño de la capacitación, y la ventana se cierra sola.
- Intentos de inicio de sesión limitados: 10 por usuario y 30 por IP en 15 minutos, con respuesta
  genérica ("usuario o contraseña incorrectos") y tiempo de respuesta uniforme.

## Cifrado de secretos

- `APP_ENCRYPTION_KEY`: 32 bytes en base64 (`openssl rand -base64 32`). Obligatoria al arrancar; la
  aplicación falla en el arranque si falta o mide mal.
- Formato almacenado: `base64(iv 12B) . base64(authTag 16B) . base64(ciphertext)`.
- Se cifran: `llm_settings.api_key_ciphertext` y `training_participants.temp_password_ciphertext`.
- Rotación de clave prevista mediante script `db:rotate-key` (descifra con la anterior, cifra con la
  nueva) — se implementa en Fase 5 solo si se necesita.

## Validación y Server Actions

- Todo dato de entrada pasa por un esquema **Zod** en `src/lib/validation/*`, compartido entre el
  formulario (React Hook Form + `zodResolver`) y el servidor. La validación del cliente es
  usabilidad; la del servidor es la que cuenta.
- Patrón obligatorio de cada Server Action:
  ```ts
  const session = await requireRole('facilitator');      // 1. autenticar + rol
  const input = schema.parse(rawInput);                  // 2. validar
  await assertOwnership(session, input.canvasId);        // 3. autorizar el recurso
  const data = await service.doThing(session, input);    // 4. ejecutar
  revalidatePath('/f/monitoreo');                        // 5. refrescar
  return { ok: true, data };
  ```
- Los route handlers (`/api/*`) repiten los pasos 1–3; no confían en el middleware.
- Límites en los esquemas: texto de nota ≤ 500 caracteres, nombre ≤ 120, alta masiva ≤ 200 filas,
  `max_output_tokens` entre 256 y 8000.
- Errores devueltos al cliente son mensajes propios; los detalles quedan en el log del servidor con
  un `requestId`.

## Contenido y salida

- El texto de los post-its se renderiza como **texto plano** (sin `dangerouslySetInnerHTML`, sin
  Markdown). React escapa por defecto; no se añade ningún camino que lo evite.
- El CSV de credenciales se genera en el servidor con prefijo defensivo (`'` ante `=`, `+`, `-`,
  `@`) para evitar inyección de fórmulas en Excel, y se sirve con
  `Content-Disposition: attachment` y `Content-Type: text/csv; charset=utf-8`.
- El logotipo, si es URL externa, se restringe por `next.config.ts` (`images.remotePatterns` desde
  variable de entorno) y no se permite `data:` ni `javascript:`.
- La salida del modelo se valida con Zod y se muestra como texto; no se ejecuta ni se interpreta.

## Cabeceras y transporte

- `Content-Security-Policy` con `default-src 'self'`, `frame-ancestors 'none'`,
  `object-src 'none'`; se ajusta en Fase 6 con los orígenes reales.
- `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy:
  strict-origin-when-cross-origin`.
- Las Server Actions de Next.js ya llevan protección CSRF por origen; se mantiene
  `serverActions.allowedOrigins` configurado por entorno.

## Registro y privacidad

- `activity_events` guarda ids y campos cambiados, **no** el texto de las notas.
- Nunca se registran: contraseñas, claves API, cookies ni el cuerpo completo de las respuestas del
  proveedor de IA.
- Los datos enviados a la IA se anonimizan: solo textos de notas, sin nombres, correos ni ids.

## Variables de entorno obligatorias

| Variable | Uso |
| -------- | --- |
| `DATABASE_URL` | Conexión a PostgreSQL (única fuente; nada codificado) |
| `AUTH_SECRET` | Firma de sesiones |
| `AUTH_URL` | URL pública de la aplicación (despliegue) |
| `APP_ENCRYPTION_KEY` | Cifrado de secretos en base de datos |
| `SEED_FACILITATOR_USERNAME` / `SEED_FACILITATOR_PASSWORD` | Solo para `db:seed` |

Se validan al arrancar con un esquema Zod en `src/lib/env.ts`; un valor faltante detiene el proceso
con un mensaje claro en lugar de fallar a mitad de una petición.

## Lista de verificación de la Fase 6 ✅

Verificada contra el servidor en ejecución (24 comprobaciones):

- [x] Ninguna ruta de participante acepta un `canvasId` ajeno — análisis de un lienzo ajeno responde
      404; `/f/*` y `/api/participants/export` quedan fuera de su alcance.
- [x] Ningún endpoint devuelve `api_key_ciphertext` ni `temp_password_ciphertext`.
- [x] Las cuentas desactivadas pierden acceso de inmediato, con la misma cookie ya emitida.
- [x] Rate limits activos en inicio de sesión (10/usuario y 30/IP en 15 min) y en análisis
      (429 con `Retry-After`).
- [x] Cabeceras presentes: CSP con `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy`,
      `X-Frame-Options`, `Strict-Transport-Security` y `Permissions-Policy`.
- [x] Sin secretos en el bundle del cliente (búsqueda de `AUTH_SECRET`, `APP_ENCRYPTION_KEY`,
      `DATABASE_URL` y la contraseña de la semilla en `.next/static`).
- [x] El texto de los post-its se escapa: `<img src=x onerror=…>` se muestra como texto, no se
      interpreta.
- [x] El CSV de credenciales no abre ninguna celda con `=` sin prefijo defensivo.

## Límite de intentos de inicio de sesión

Implementado en la Fase 6 sobre la tabla `login_attempts` (id, `subject`, `created_at`):

- `subject` es `user:<usuario>` o `ip:<dirección>`; nunca se guarda la contraseña.
- Ventana de 15 minutos: 10 fallos por usuario, 30 por IP.
- La comprobación ocurre **antes** de tocar la base o de gastar Argon2.
- Un inicio de sesión correcto limpia el historial de ese usuario y esa IP.
- Cada escritura purga las filas fuera de la ventana, así que la tabla no crece.
- Vive en base de datos y no en memoria del proceso para que el límite siga valiendo con varias
  instancias desplegadas.
- La respuesta es siempre la misma ("usuario o contraseña incorrectos"): no se revela si la cuenta
  está bloqueada.
