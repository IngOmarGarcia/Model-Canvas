import { handlers } from '@/server/auth';

export const { GET, POST } = handlers;

// El proveedor de credenciales usa Argon2 (binario nativo) y el pool de Postgres.
export const runtime = 'nodejs';
