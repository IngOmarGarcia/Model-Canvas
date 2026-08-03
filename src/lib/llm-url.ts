/**
 * Utilidades de URL para el proveedor de IA, compartidas por el servidor y el
 * formulario de configuración: ambos necesitan distinguir una dirección local
 * (que solo existe en la máquina del desarrollador) de una pública alcanzable
 * desde Netlify. Sin 'server-only' a propósito.
 */

/** Quita la barra final y añade el esquema si falta (OLLAMA_HOST suele omitirlo). */
export function normalizeBaseUrl(value: string | undefined | null): string {
  const trimmed = value?.trim();
  if (!trimmed) return '';

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
  return withScheme.replace(/\/+$/, '');
}

/**
 * Direcciones que solo resuelven dentro de la propia máquina o de una red
 * privada. Desde una función de Netlify ninguna es alcanzable.
 */
const PRIVATE_HOSTNAME =
  /^(localhost|0\.0\.0\.0|::1|host\.docker\.internal|127\.\d{1,3}\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})$/i;

export function isLocallyBoundUrl(value: string): boolean {
  if (!value) return false;

  try {
    // El hostname de una IPv6 llega entre corchetes: [::1].
    const hostname = new URL(normalizeBaseUrl(value)).hostname.replace(/^\[|\]$/g, '');
    return (
      PRIVATE_HOSTNAME.test(hostname) ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    );
  } catch {
    // URL inválida: que falle más adelante el proveedor, con su propio mensaje.
    return false;
  }
}
