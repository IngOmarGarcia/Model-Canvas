# 00 — Visión y alcance

## Objetivo

Facilitar capacitaciones presenciales o remotas sobre el Business Model Canvas. El facilitador
prepara la sesión, entrega credenciales, explica los nueve módulos y observa en vivo cómo avanza
cada participante. El participante construye su lienzo con post-its y puede pedir un análisis
generado por IA sobre su avance.

## Actores

| Actor | Descripción |
| ----- | ----------- |
| **Facilitador / Ponente** | Administra la organización, la capacitación y los participantes. Observa el progreso en tiempo real, proyecta lienzos, configura el proveedor de IA. |
| **Participante** | Accede con credenciales temporales, trabaja únicamente sobre su propio lienzo y consulta la metodología y sus análisis. |

## Recorridos principales

**Facilitador**
1. Inicia sesión → 2. Crea la capacitación → 3. Da de alta participantes (individual o masiva) y
descarga credenciales → 4. Explica la metodología desde la vista educativa → 5. Monitorea avance en
tiempo real → 6. Abre lienzos en modo lectura y proyecta en modo presentación → 7. Solicita análisis
individual o general.

**Participante**
1. Inicia sesión con la credencial entregada → 2. Abre su lienzo → 3. Lee la explicación y las
preguntas guía de cada módulo → 4. Crea, edita, colorea y arrastra post-its (guardado automático) →
5. Solicita análisis y consulta el más reciente.

## Alcance incluido

- Autenticación por credenciales con dos roles y sesiones firmadas.
- Gestión de organización, capacitación y participantes, con credenciales temporales.
- Lienzo BMC de nueve bloques con post-its: crear, editar, mover, recolorar, eliminar, reordenar y
  cambiar de módulo, con guardado automático y optimista.
- Monitoreo en tiempo real por eventos (SSE) con respaldo por polling incremental.
- Modo presentación a pantalla completa con zoom y conmutación entre lienzos.
- Vista educativa de la metodología con los nueve módulos, preguntas guía y ejemplos breves.
- Análisis por IA con abstracción de proveedores (Anthropic, OpenAI, Ollama remoto), salida JSON
  estructurada, reutilización por hash de contenido y límite de peticiones por usuario.
- Tres temas visuales por variables CSS y diseño responsivo desktop / tablet / móvil.

## Fuera de alcance (v1)

- Edición colaborativa simultánea sobre un mismo lienzo (varios cursores en el mismo canvas).
- Chat, videollamada o audio dentro de la aplicación.
- Multi-tenant con autoservicio de registro público (las organizaciones se crean por semilla o por
  el facilitador administrador).
- Exportación a PDF/PNG del lienzo (candidata para v1.1; se documenta el hueco, no se implementa).
- Historial de versiones y deshacer entre sesiones (el deshacer es local a la sesión de edición).

## Glosario

| Término | Significado en el producto |
| ------- | -------------------------- |
| **Capacitación** (`training_session`) | Evento formativo con un facilitador y N participantes. |
| **Lienzo** (`canvas`) | Tablero BMC de nueve módulos. Uno por participante; uno del facilitador; opcionalmente uno consolidado por sesión. |
| **Módulo** | Cada uno de los nueve bloques del BMC. |
| **Post-it** (`sticky_note`) | Nota de texto con color y posición dentro de un módulo. |
| **Avance** | Porcentaje de módulos con al menos una nota (0–100). |
| **Análisis** | Resultado JSON generado por IA sobre un lienzo o sobre la sesión completa. |
| **Modo presentación** | Vista sin navegación, a pantalla completa, pensada para proyector o para compartir pantalla en Meet/Zoom. |

## Restricciones de producto

- La aplicación debe funcionar desplegada en cualquier host: nada puede depender de `localhost`
  como requisito funcional. La base de datos se configura con `DATABASE_URL` y los proveedores
  externos con variables de entorno.
- Las claves de proveedores de IA nunca llegan al cliente: se almacenan cifradas y solo se usan en
  el servidor.
- Un participante no puede, bajo ninguna ruta, leer el lienzo de otro participante.
