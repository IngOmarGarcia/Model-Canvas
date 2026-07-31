# 03 — Roles y permisos

## Roles

| Rol | Valor en BD | Alcance |
| --- | ----------- | ------- |
| Facilitador / Ponente | `facilitator` | Su organización y las capacitaciones que administra. |
| Participante | `participant` | Únicamente su propio lienzo y su propio perfil. |

No hay auto-registro público. El primer facilitador se crea con `db:seed`; los participantes los
crea el facilitador.

## Matriz de permisos

| Capacidad | Facilitador | Participante |
| --------- | :---------: | :----------: |
| Iniciar sesión | ✅ | ✅ (credenciales entregadas) |
| Crear / editar capacitación | ✅ | ❌ |
| Crear, editar, desactivar y eliminar participantes | ✅ | ❌ |
| Generar credenciales temporales y reiniciar contraseñas | ✅ | ❌ (solo cambia la propia) |
| Copiar credenciales / descargar CSV | ✅ | ❌ |
| Ver la lista de participantes | ✅ | ❌ |
| Ver avance en tiempo real de todos | ✅ | ❌ |
| Abrir el lienzo de un participante | ✅ **solo lectura** | ❌ |
| Abrir el lienzo propio y editarlo | ✅ (lienzo del facilitador) | ✅ (lienzo propio) |
| Crear, editar, mover, recolorar y eliminar post-its | ✅ en su lienzo | ✅ en su lienzo |
| Lienzo general / consolidado de la sesión | ✅ | ❌ |
| Modo presentación y pantalla completa | ✅ | ❌ |
| Elegir qué lienzo se proyecta | ✅ | ❌ |
| Ver la metodología (9 módulos, preguntas guía) | ✅ | ✅ |
| Solicitar análisis de un lienzo | ✅ (cualquiera de la sesión) | ✅ (solo el propio) |
| Solicitar análisis general de la capacitación | ✅ | ❌ |
| Consultar el análisis más reciente | ✅ | ✅ (solo el propio) |
| Configurar organización, tema y logotipo | ✅ | ❌ |
| Configurar proveedor de IA, modelo, URL base y clave | ✅ | ❌ |
| Ver la clave API (aunque sea enmascarada) | ⚠️ solo últimos 4 caracteres | ❌ |
| Cambiar el tema visual de su propia interfaz | ✅ | ✅ (preferencia local) |

## Reglas de autorización (se aplican en el servidor, siempre)

1. **Guard por segmento de ruta.** `(facilitator)/f/*` exige `role === 'facilitator'`;
   `(participant)/p/*` exige `role === 'participant'`. El middleware redirige a `/login` sin sesión
   y a la raíz del rol correcto si el rol no corresponde.
2. **La ruta no es la autorización.** Cada Server Action y cada route handler vuelve a resolver la
   sesión y comprueba la propiedad del recurso. El middleware es conveniencia de navegación, no
   control de acceso.
3. **Propiedad de lienzo.** Escribir en `sticky_notes` requiere que el `canvas.owner_id` sea el
   actor. El facilitador **no** escribe en lienzos de participantes: al abrirlos, la UI y el
   servicio operan en modo lectura.
4. **Aislamiento entre participantes.** Toda consulta de participante filtra por `owner_id = actor`.
   Un id de lienzo ajeno devuelve `404`, no `403` (no se confirma la existencia del recurso).
5. **Aislamiento por organización.** El facilitador solo alcanza recursos cuya
   `organization_id` coincide con la suya; se comprueba con un `join`, no confiando en el parámetro
   de la petición.
6. **Secretos.** `llm_settings.api_key_ciphertext` nunca sale del servidor. Las consultas de
   configuración devuelven un DTO con `api_key_last4` y `has_api_key: boolean`.
7. **Cuenta desactivada.** `profiles.is_active = false` invalida el acceso en cada petición
   (comprobación en el callback de sesión), no solo al iniciar sesión.
8. **Eliminación de participante.** Borra en cascada su lienzo, notas y análisis; queda registro en
   `activity_events` con el actor que ejecutó la acción.

## Estados de la credencial temporal

```
generada ──(entrega)──► activa ──(primer inicio de sesión)──► en uso ──(cambio de contraseña)──► personal
   │                                                                 │
   └──────────────────(reinicio por facilitador)◄────────────────────┘
```

El texto en claro de la contraseña temporal se conserva **cifrado** para permitir copiar/descargar
credenciales hasta el primer inicio de sesión; a partir de ahí se borra y solo queda el hash. Ver
[09 — Seguridad](./09-seguridad.md).
