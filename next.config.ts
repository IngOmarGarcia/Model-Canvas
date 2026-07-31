import type { NextConfig } from 'next';

/** Dominios permitidos para logotipos remotos, desde variable de entorno. */
const imageDomains = (process.env.NEXT_PUBLIC_IMAGE_DOMAINS ?? '')
  .split(',')
  .map((d) => d.trim())
  .filter(Boolean);

/** Orígenes permitidos para Server Actions cuando la app corre detrás de un proxy. */
const allowedOrigins = (process.env.SERVER_ACTIONS_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

/**
 * Política de contenido. 'unsafe-inline' en script-src es necesario para el
 * script anti-parpadeo del tema y para el arranque de Next; el resto queda
 * restringido al propio origen. connect-src incluye el propio origen para SSE.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Solo tiene efecto sobre HTTPS; en desarrollo el navegador lo ignora.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  // Hay un package-lock.json suelto en el directorio del usuario; sin esto Next
  // infiere ese directorio como raíz del workspace y el rastreo de archivos falla.
  outputFileTracingRoot: process.cwd(),
  experimental: {
    ...(allowedOrigins.length > 0 ? { serverActions: { allowedOrigins } } : {}),
  },
  // argon2 es un binario nativo: no debe empaquetarse en el bundle del servidor.
  serverExternalPackages: ['@node-rs/argon2', 'pg'],
  images: {
    remotePatterns: imageDomains.map((hostname) => ({
      protocol: 'https' as const,
      hostname,
    })),
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
