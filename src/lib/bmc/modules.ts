/**
 * Los nueve módulos del Business Model Canvas.
 *
 * Fuente única de verdad para: bloques del lienzo, vista de Metodología,
 * tooltips de ayuda y el contexto del prompt de análisis por IA.
 * Contenido resumido con redacción propia a partir del marco de
 * Osterwalder & Pigneur (ver docs/02-metodologia-bmc.md).
 */

export const MODULE_KEYS = [
  'customer_segments',
  'value_propositions',
  'channels',
  'customer_relationships',
  'revenue_streams',
  'key_resources',
  'key_activities',
  'key_partnerships',
  'cost_structure',
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export type BmcArea = 'clientes' | 'oferta' | 'infraestructura' | 'viabilidad';

export interface BmcModule {
  key: ModuleKey;
  /** Posición en el orden metodológico de trabajo (1–9). */
  order: number;
  name: string;
  /** Icono de lucide-react. */
  icon: string;
  area: BmcArea;
  /** 1–2 líneas. Nunca párrafos extensos en pantalla. */
  description: string;
  /** 4–5 preguntas orientadoras. */
  questions: string[];
  /** Una sola frase. */
  example: string;
  /** Conceptos mínimos necesarios para la capacitación. */
  concepts: string[];
}

export const BMC_MODULES: readonly BmcModule[] = [
  {
    key: 'customer_segments',
    order: 1,
    name: 'Segmentos de mercado',
    icon: 'Users',
    area: 'clientes',
    description:
      'Define los grupos de personas u organizaciones a los que la empresa quiere llegar y servir. Sin clientes no hay modelo viable, y no todos los clientes valen lo mismo.',
    questions: [
      '¿Para quién estamos creando valor?',
      '¿Quiénes son nuestros clientes más importantes?',
      '¿Qué necesidades, comportamientos o problemas comparten?',
      '¿Requieren una oferta, un canal o una relación distinta entre sí?',
      '¿Cuánto está dispuesto a pagar cada grupo?',
    ],
    example:
      'Una plataforma de cursos separa "estudiantes autodidactas" de "empresas que capacitan a su personal": distinta necesidad, distinto canal y distinto precio.',
    concepts: [
      'Mercado de masas',
      'Nicho de mercado',
      'Mercado segmentado',
      'Mercado diversificado',
      'Plataformas multilaterales',
    ],
  },
  {
    key: 'value_propositions',
    order: 2,
    name: 'Propuestas de valor',
    icon: 'Gem',
    area: 'oferta',
    description:
      'El conjunto de productos y servicios que resuelve un problema o satisface una necesidad de un segmento. Es la razón por la que el cliente elige una empresa y no otra.',
    questions: [
      '¿Qué valor entregamos al cliente?',
      '¿Qué problema le ayudamos a resolver?',
      '¿Qué necesidad satisfacemos?',
      '¿Qué combinación de productos y servicios ofrecemos a cada segmento?',
      '¿Por qué nos elegirían en lugar de la competencia?',
    ],
    example:
      'Un servicio de mensajería con entrega el mismo día vende rapidez; su competencia low-cost vende precio. Son propuestas de valor distintas.',
    concepts: [
      'Valor cuantitativo: precio, velocidad, reducción de costes o de riesgo',
      'Valor cualitativo: diseño, marca, experiencia, personalización',
      'Comodidad y accesibilidad',
      '"Trabajo hecho" y novedad',
    ],
  },
  {
    key: 'channels',
    order: 3,
    name: 'Canales',
    icon: 'Send',
    area: 'oferta',
    description:
      'Cómo la empresa se comunica con cada segmento y le hace llegar la propuesta de valor. Incluye información, compra, entrega y posventa.',
    questions: [
      '¿Por qué canales quieren ser contactados nuestros clientes?',
      '¿Cómo los estamos contactando ahora?',
      '¿Qué canales funcionan mejor y cuáles son más rentables?',
      '¿Están integrados entre sí y con la rutina del cliente?',
      '¿Cómo cubrimos cada fase: conocimiento, evaluación, compra, entrega y posventa?',
    ],
    example:
      'Se da a conocer por redes sociales, se evalúa con una demo, se compra en la web, se entrega por app y la posventa se atiende por WhatsApp.',
    concepts: [
      'Canales propios frente a canales de socios',
      'Canales directos e indirectos',
      'Las cinco fases: conocimiento, evaluación, compra, entrega, posventa',
    ],
  },
  {
    key: 'customer_relationships',
    order: 4,
    name: 'Relaciones con clientes',
    icon: 'HeartHandshake',
    area: 'clientes',
    description:
      'El tipo de relación que se establece con cada segmento, ya sea para captar clientes, retenerlos o aumentar las ventas.',
    questions: [
      '¿Qué tipo de relación espera cada segmento?',
      '¿Cuáles hemos establecido ya y cuánto cuestan?',
      '¿Cómo se integran con el resto del modelo?',
      '¿Buscamos captar, retener o vender más?',
      '¿Qué parte puede ser autoservicio o automatizarse?',
    ],
    example:
      'Un banco digital resuelve el 90 % por autoservicio en la app y reserva la asistencia personal para incidencias de fraude.',
    concepts: [
      'Asistencia personal y asistencia personal dedicada',
      'Autoservicio',
      'Servicios automáticos',
      'Comunidades',
      'Creación colectiva (cocreación)',
    ],
  },
  {
    key: 'revenue_streams',
    order: 5,
    name: 'Fuentes de ingresos',
    icon: 'Banknote',
    area: 'viabilidad',
    description:
      'El dinero que la empresa genera en cada segmento. Un modelo puede tener varias fuentes con mecanismos de precio distintos.',
    questions: [
      '¿Por qué valor están realmente dispuestos a pagar nuestros clientes?',
      '¿Por qué pagan hoy y cómo pagan?',
      '¿Cómo preferirían pagar?',
      '¿Cuánto aporta cada fuente al ingreso total?',
      '¿Son ingresos únicos o recurrentes?',
    ],
    example:
      'Un software cobra suscripción mensual (recurrente) más implementación inicial (pago único).',
    concepts: [
      'Venta de activos, cuota por uso, suscripción',
      'Préstamo, alquiler o leasing; licencias; corretaje; publicidad',
      'Precio fijo: lista, por características, por segmento, por volumen',
      'Precio dinámico: negociación, rentabilidad, tiempo real, subasta',
    ],
  },
  {
    key: 'key_resources',
    order: 6,
    name: 'Recursos clave',
    icon: 'Boxes',
    area: 'infraestructura',
    description:
      'Los activos imprescindibles para que el modelo funcione: crear la oferta, llegar al mercado, mantener relaciones y generar ingresos.',
    questions: [
      '¿Qué recursos exige nuestra propuesta de valor?',
      '¿Y nuestros canales, relaciones y fuentes de ingresos?',
      '¿Cuáles son propios, alquilados o de un socio?',
      '¿Cuál de ellos es el más difícil de sustituir?',
    ],
    example:
      'Para una app de reparto, los recursos clave son la plataforma tecnológica y la red de repartidores; no los vehículos.',
    concepts: [
      'Recursos físicos',
      'Recursos intelectuales: marca, patentes, datos',
      'Recursos humanos',
      'Recursos económicos',
    ],
  },
  {
    key: 'key_activities',
    order: 7,
    name: 'Actividades clave',
    icon: 'ListChecks',
    area: 'infraestructura',
    description:
      'Las acciones más importantes que la empresa debe realizar para que el modelo funcione.',
    questions: [
      '¿Qué actividades exige nuestra propuesta de valor?',
      '¿Y nuestros canales, relaciones y fuentes de ingresos?',
      '¿Cuáles hacemos nosotros y cuáles se delegan?',
      '¿Cuál es la actividad sin la cual el negocio se detiene?',
    ],
    example:
      'En una consultora la actividad clave es resolver problemas; en una fábrica, producir; en un marketplace, operar la plataforma.',
    concepts: ['Producción', 'Resolución de problemas', 'Plataforma o red'],
  },
  {
    key: 'key_partnerships',
    order: 8,
    name: 'Asociaciones clave',
    icon: 'Handshake',
    area: 'infraestructura',
    description:
      'La red de proveedores y socios que hacen que el modelo funcione; se crean para optimizar, reducir riesgo o adquirir recursos.',
    questions: [
      '¿Quiénes son nuestros socios y proveedores clave?',
      '¿Qué recursos clave adquirimos de ellos?',
      '¿Qué actividades clave realizan por nosotros?',
      '¿Por qué nos asociamos: coste, riesgo o acceso?',
    ],
    example:
      'Una marca de ropa no fabrica: se asocia con talleres certificados y con una operadora logística para la entrega.',
    concepts: [
      'Alianzas estratégicas entre no competidores',
      'Coopetición: alianza entre competidores',
      'Joint ventures',
      'Relaciones cliente-proveedor',
      'Motivos: optimización, reducción de riesgo, compra de recursos',
    ],
  },
  {
    key: 'cost_structure',
    order: 9,
    name: 'Estructura de costes',
    icon: 'Receipt',
    area: 'viabilidad',
    description:
      'Todos los costes derivados de operar el modelo. Se deducen de los recursos, actividades y asociaciones clave.',
    questions: [
      '¿Cuáles son los costes más importantes de nuestro modelo?',
      '¿Qué recursos clave son los más caros?',
      '¿Qué actividades clave son las más caras?',
      '¿Nuestro modelo compite por coste o por valor?',
      '¿Qué costes son fijos y cuáles variables?',
    ],
    example:
      'En una aerolínea de bajo coste dominan los costes fijos de flota y combustible; el modelo se diseña para maximizar la ocupación.',
    concepts: [
      'Modelo según coste frente a modelo según valor',
      'Costes fijos y costes variables',
      'Economías de escala y economías de campo',
    ],
  },
] as const;

/** Acceso por clave, sin recorrer el arreglo. */
export const MODULE_BY_KEY: Record<ModuleKey, BmcModule> = Object.fromEntries(
  BMC_MODULES.map((m) => [m.key, m]),
) as Record<ModuleKey, BmcModule>;

/** Orden metodológico (1 → 9), el que usa la vista de Metodología y el avance. */
export const MODULES_IN_ORDER = [...BMC_MODULES].sort((a, b) => a.order - b.order);

export function getModule(key: ModuleKey): BmcModule {
  return MODULE_BY_KEY[key];
}

export function isModuleKey(value: string): value is ModuleKey {
  return (MODULE_KEYS as readonly string[]).includes(value);
}

/** Módulo anterior y siguiente para la navegación del recorrido metodológico. */
export function getModuleNeighbors(key: ModuleKey) {
  const index = MODULES_IN_ORDER.findIndex((m) => m.key === key);
  return {
    previous: index > 0 ? MODULES_IN_ORDER[index - 1] : null,
    next: index < MODULES_IN_ORDER.length - 1 ? MODULES_IN_ORDER[index + 1] : null,
  };
}

export const TOTAL_MODULES = MODULE_KEYS.length;
