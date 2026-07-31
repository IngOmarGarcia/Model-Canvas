# 02 — Metodología: los nueve módulos del Business Model Canvas

Contenido conceptual basado en *Generación de modelos de negocio* (Osterwalder & Pigneur), resumido
con redacción propia para uso didáctico. Este documento es la **fuente única de verdad** que se
implementará en `src/lib/bmc/modules.ts` y alimentará la vista de Metodología, los tooltips de ayuda
de cada bloque y el prompt de análisis por IA.

## Idea base

Un modelo de negocio describe cómo una organización **crea, entrega y captura valor**. El lienzo lo
divide en nueve módulos que cubren cuatro áreas: clientes, oferta, infraestructura y viabilidad
económica.

## Orden metodológico de trabajo

Se completa en este orden (es el que usa la aplicación para numerar, navegar y calcular avance):

1. Segmentos de mercado → 2. Propuestas de valor → 3. Canales → 4. Relaciones con clientes →
5. Fuentes de ingresos → 6. Recursos clave → 7. Actividades clave → 8. Asociaciones clave →
9. Estructura de costes.

Lógica del recorrido: primero **para quién** se crea valor, luego **qué** valor, después **cómo**
llega y **cómo** se sostiene la relación, con eso **cuánto** ingresa; a continuación **con qué** se
opera (recursos, actividades, socios) y finalmente **cuánto cuesta**.

## Distribución visual (rejilla tradicional)

El orden de trabajo no coincide con la posición en el lienzo. Distribución que se implementará:

```
┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│              │ 7 Actividades│              │ 4 Relaciones │              │
│ 8 Asociac.   │    clave     │ 2 Propuestas │  con clientes│ 1 Segmentos  │
│    clave     ├──────────────┤   de valor   ├──────────────┤  de mercado  │
│              │ 6 Recursos   │              │  3 Canales   │              │
│              │    clave     │              │              │              │
├──────────────┴──────────────┴───────┬──────┴──────────────┴──────────────┤
│      9 Estructura de costes         │      5 Fuentes de ingresos         │
└─────────────────────────────────────┴────────────────────────────────────┘
```

Rejilla CSS: 5 columnas × 3 filas. Fila superior (2 filas de alto) para los módulos 8, 7, 6, 2, 4,
3, 1; fila inferior para 9 (columnas 1–2.5) y 5 (columnas 2.5–5). En tablet colapsa a 2 columnas y
en móvil a 1 columna, conservando la numeración.

---

## 1. Segmentos de mercado

- **Clave:** `customer_segments` · **Icono:** `users` · **Área:** clientes
- **Descripción breve:** define los grupos de personas u organizaciones a los que la empresa quiere
  llegar y servir. Sin clientes no hay modelo viable, y no todos los clientes valen lo mismo.
- **Preguntas orientadoras**
  - ¿Para quién estamos creando valor?
  - ¿Quiénes son nuestros clientes más importantes?
  - ¿Qué necesidades, comportamientos o problemas comparten?
  - ¿Requieren una oferta, un canal o una relación distinta entre sí?
  - ¿Cuánto está dispuesto a pagar cada grupo?
- **Ejemplo corto:** una plataforma de cursos separa "estudiantes autodidactas" de "empresas que
  capacitan a su personal": distinta necesidad, distinto canal y distinto precio.
- **Conceptos mínimos:** mercado de masas · nicho de mercado · mercado segmentado · mercado
  diversificado · plataformas multilaterales (dos o más segmentos interdependientes).

## 2. Propuestas de valor

- **Clave:** `value_propositions` · **Icono:** `gem` · **Área:** oferta
- **Descripción breve:** el conjunto de productos y servicios que resuelve un problema o satisface
  una necesidad de un segmento. Es la razón por la que el cliente elige una empresa y no otra.
- **Preguntas orientadoras**
  - ¿Qué valor entregamos al cliente?
  - ¿Qué problema le ayudamos a resolver?
  - ¿Qué necesidad satisfacemos?
  - ¿Qué combinación de productos y servicios ofrecemos a cada segmento?
  - ¿Por qué nos elegirían en lugar de la competencia?
- **Ejemplo corto:** un servicio de mensajería con entrega el mismo día vende sobre todo
  **rapidez**; su competencia low-cost vende **precio**. Son propuestas de valor distintas.
- **Conceptos mínimos:** valor cuantitativo (precio, velocidad, reducción de costes o de riesgo) y
  cualitativo (diseño, marca, experiencia, personalización, comodidad, accesibilidad, "trabajo
  hecho", novedad).

## 3. Canales

- **Clave:** `channels` · **Icono:** `send` · **Área:** oferta
- **Descripción breve:** cómo la empresa se comunica con cada segmento y le hace llegar la
  propuesta de valor. Incluye información, compra, entrega y posventa.
- **Preguntas orientadoras**
  - ¿Por qué canales quieren ser contactados nuestros clientes?
  - ¿Cómo los estamos contactando ahora?
  - ¿Qué canales funcionan mejor y cuáles son más rentables?
  - ¿Están integrados entre sí y con la rutina del cliente?
  - ¿Cómo cubrimos cada fase: conocimiento, evaluación, compra, entrega y posventa?
- **Ejemplo corto:** se da a conocer por redes sociales, se evalúa con una demo, se compra en la
  web, se entrega por app y la posventa se atiende por WhatsApp.
- **Conceptos mínimos:** canales propios vs. de socios · directos vs. indirectos · las cinco fases
  del canal (conocimiento → evaluación → compra → entrega → posventa).

## 4. Relaciones con clientes

- **Clave:** `customer_relationships` · **Icono:** `heart-handshake` · **Área:** clientes
- **Descripción breve:** el tipo de relación que se establece con cada segmento, ya sea para
  captar clientes, retenerlos o aumentar las ventas.
- **Preguntas orientadoras**
  - ¿Qué tipo de relación espera cada segmento?
  - ¿Cuáles hemos establecido ya y cuánto cuestan?
  - ¿Cómo se integran con el resto del modelo?
  - ¿Buscamos captar, retener o vender más?
  - ¿Qué parte puede ser autoservicio o automatizarse?
- **Ejemplo corto:** un banco digital resuelve el 90 % por autoservicio en la app y reserva la
  asistencia personal para incidencias de fraude.
- **Conceptos mínimos:** asistencia personal · asistencia personal dedicada · autoservicio ·
  servicios automáticos · comunidades · creación colectiva (cocreación).

## 5. Fuentes de ingresos

- **Clave:** `revenue_streams` · **Icono:** `banknote` · **Área:** viabilidad
- **Descripción breve:** el dinero que la empresa genera en cada segmento. Un modelo puede tener
  varias fuentes con mecanismos de precio distintos.
- **Preguntas orientadoras**
  - ¿Por qué valor están realmente dispuestos a pagar nuestros clientes?
  - ¿Por qué pagan hoy y cómo pagan?
  - ¿Cómo preferirían pagar?
  - ¿Cuánto aporta cada fuente al ingreso total?
  - ¿Son ingresos únicos o recurrentes?
- **Ejemplo corto:** un software cobra suscripción mensual (recurrente) más implementación inicial
  (pago único).
- **Conceptos mínimos:** venta de activos · cuota por uso · cuota de suscripción · préstamo,
  alquiler o leasing · concesión de licencias · gastos de corretaje · publicidad. Fijación de
  precios **fija** (lista, por características, por segmento, por volumen) o **dinámica**
  (negociación, gestión de la rentabilidad, tiempo real, subasta).

## 6. Recursos clave

- **Clave:** `key_resources` · **Icono:** `boxes` · **Área:** infraestructura
- **Descripción breve:** los activos imprescindibles para que el modelo funcione: crear la oferta,
  llegar al mercado, mantener relaciones y generar ingresos.
- **Preguntas orientadoras**
  - ¿Qué recursos exige nuestra propuesta de valor?
  - ¿Y nuestros canales, relaciones y fuentes de ingresos?
  - ¿Cuáles son propios, alquilados o de un socio?
  - ¿Cuál de ellos es el más difícil de sustituir?
- **Ejemplo corto:** para una app de reparto, los recursos clave son la plataforma tecnológica y la
  red de repartidores; no los vehículos.
- **Conceptos mínimos:** recursos físicos · intelectuales (marca, patentes, datos) · humanos ·
  económicos.

## 7. Actividades clave

- **Clave:** `key_activities` · **Icono:** `list-checks` · **Área:** infraestructura
- **Descripción breve:** las acciones más importantes que la empresa debe realizar para que el
  modelo funcione.
- **Preguntas orientadoras**
  - ¿Qué actividades exige nuestra propuesta de valor?
  - ¿Y nuestros canales, relaciones y fuentes de ingresos?
  - ¿Cuáles hacemos nosotros y cuáles se delegan?
  - ¿Cuál es la actividad sin la cual el negocio se detiene?
- **Ejemplo corto:** en una consultora la actividad clave es **resolver problemas**; en una fábrica,
  **producir**; en un marketplace, **operar y hacer crecer la plataforma**.
- **Conceptos mínimos:** producción · resolución de problemas · plataforma o red.

## 8. Asociaciones clave

- **Clave:** `key_partnerships` · **Icono:** `handshake` · **Área:** infraestructura
- **Descripción breve:** la red de proveedores y socios que hacen que el modelo funcione; se
  crean para optimizar, reducir riesgo o adquirir recursos.
- **Preguntas orientadoras**
  - ¿Quiénes son nuestros socios y proveedores clave?
  - ¿Qué recursos clave adquirimos de ellos?
  - ¿Qué actividades clave realizan por nosotros?
  - ¿Por qué nos asociamos: coste, riesgo o acceso?
- **Ejemplo corto:** una marca de ropa no fabrica: se asocia con talleres certificados y con una
  operadora logística para la entrega.
- **Conceptos mínimos:** alianzas estratégicas entre no competidores · coopetición (alianza entre
  competidores) · joint ventures · relaciones cliente-proveedor. Motivaciones: optimización y
  economía de escala, reducción de riesgos e incertidumbre, compra de recursos o actividades.

## 9. Estructura de costes

- **Clave:** `cost_structure` · **Icono:** `receipt` · **Área:** viabilidad
- **Descripción breve:** todos los costes derivados de operar el modelo. Se deducen de los recursos,
  actividades y asociaciones clave.
- **Preguntas orientadoras**
  - ¿Cuáles son los costes más importantes de nuestro modelo?
  - ¿Qué recursos clave son los más caros?
  - ¿Qué actividades clave son las más caras?
  - ¿Nuestro modelo compite por coste o por valor?
  - ¿Qué costes son fijos y cuáles variables?
- **Ejemplo corto:** en una aerolínea de bajo coste dominan los costes fijos de flota y
  combustible; el modelo se diseña para maximizar la ocupación.
- **Conceptos mínimos:** modelo según **coste** (minimizar gastos) vs. según **valor** (foco en la
  propuesta premium) · costes fijos y variables · economías de escala y economías de campo.

---

## Cómo se usa este contenido en la aplicación

| Uso | Dónde |
| --- | ----- |
| Título, número e icono del bloque | `components/canvas/module-block.tsx` |
| Descripción breve en el botón de ayuda (popover) | `components/canvas/module-help.tsx` |
| Descripción + preguntas + ejemplo + navegación anterior/siguiente | `app/(facilitator)/f/metodologia` y `app/(participant)/p/metodologia` |
| Contexto del prompt de análisis (nombre y descripción de cada módulo) | `server/llm/prompts.ts` |
| Cálculo de avance: 9 módulos, cada uno con ≥1 nota | `server/services/canvas.service.ts` |

Regla de redacción para la UI: descripción de **1–2 líneas**, entre **4 y 5** preguntas y **1**
ejemplo de una sola frase. Nada de párrafos extensos en pantalla.
