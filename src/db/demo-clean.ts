import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

import { like } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema';
import { profiles } from './schema';

/** Elimina los participantes de demostración (borrado en cascada). */
async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no está definida.');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  try {
    const borrados = await db
      .delete(profiles)
      .where(like(profiles.username, 'demo.%'))
      .returning({ username: profiles.username });

    if (borrados.length === 0) {
      console.log('No había participantes de demostración.');
    } else {
      for (const b of borrados) console.log(`✓ eliminado ${b.username}`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('\n✗ Error:', error);
  process.exit(1);
});
