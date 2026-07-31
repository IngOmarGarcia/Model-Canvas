import 'server-only';

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { getEnv } from '@/lib/env';

import * as schema from './schema';

/**
 * Cliente Drizzle. Un único pool por proceso; en desarrollo se conserva entre
 * recargas de Next para no agotar las conexiones de Postgres.
 */
const globalForDb = globalThis as unknown as { __canvasPool?: Pool };

function createPool(): Pool {
  return new Pool({
    connectionString: getEnv().DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
  });
}

export const pool = globalForDb.__canvasPool ?? createPool();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__canvasPool = pool;
}

export const db = drizzle(pool, { schema });

export type Database = typeof db;
export { schema };
