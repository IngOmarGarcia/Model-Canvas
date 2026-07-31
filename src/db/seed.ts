import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

import { hash } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { MODULES_IN_ORDER } from '../lib/bmc/modules';

import {
  canvasModules,
  canvases,
  llmSettings,
  organizations,
  profiles,
  trainingSessions,
} from './schema';
import * as schema from './schema';

/**
 * Semilla inicial: organización, facilitador, capacitación en borrador, el
 * lienzo del facilitador con sus nueve módulos y la configuración de IA vacía.
 *
 * Este script corre con tsx (Node puro), por eso abre su propio pool en lugar
 * de importar src/db/index.ts, que está marcado como `server-only`.
 * Es idempotente: si el facilitador ya existe, no duplica nada.
 */
async function seed(pool: Pool) {
  const db = drizzle(pool, { schema });

  const orgName = process.env.SEED_ORGANIZATION_NAME ?? 'Mi organización';
  const trainingName = process.env.SEED_TRAINING_NAME ?? 'Capacitación Business Model Canvas';
  const facilitatorName = process.env.SEED_FACILITATOR_NAME ?? 'Facilitador';
  const username = (process.env.SEED_FACILITATOR_USERNAME ?? 'facilitador').toLowerCase();
  const password = process.env.SEED_FACILITATOR_PASSWORD;

  if (!password) {
    throw new Error(
      'SEED_FACILITATOR_PASSWORD no está definida. Agrégala a .env.local antes de sembrar.',
    );
  }

  await db.transaction(async (tx) => {
    // 1. Organización
    let [org] = await tx.select().from(organizations).where(eq(organizations.name, orgName));

    if (!org) {
      [org] = await tx.insert(organizations).values({ name: orgName }).returning();
      console.log(`✓ Organización creada: ${org.name}`);
    } else {
      console.log(`· Organización existente: ${org.name}`);
    }

    // 2. Facilitador
    const [existing] = await tx.select().from(profiles).where(eq(profiles.username, username));

    if (existing) {
      console.log(`· El facilitador "${username}" ya existe. Nada que sembrar.`);
      return;
    }

    const [facilitator] = await tx
      .insert(profiles)
      .values({
        organizationId: org.id,
        username,
        fullName: facilitatorName,
        passwordHash: await hash(password),
        role: 'facilitator',
        isActive: true,
        mustChangePassword: false,
      })
      .returning();

    console.log(`✓ Facilitador creado: ${facilitator.username}`);

    // 3. Capacitación
    const [training] = await tx
      .insert(trainingSessions)
      .values({
        organizationId: org.id,
        facilitatorId: facilitator.id,
        name: trainingName,
        status: 'draft',
      })
      .returning();

    console.log(`✓ Capacitación creada: ${training.name}`);

    // 4. Lienzo del facilitador + sus nueve módulos
    const [canvas] = await tx
      .insert(canvases)
      .values({
        trainingSessionId: training.id,
        ownerId: facilitator.id,
        kind: 'facilitator',
        title: 'Lienzo del facilitador',
      })
      .returning();

    await tx.insert(canvasModules).values(
      MODULES_IN_ORDER.map((m) => ({
        canvasId: canvas.id,
        moduleKey: m.key,
        orderIndex: m.order,
      })),
    );

    console.log('✓ Lienzo del facilitador con sus 9 módulos');

    // 5. Configuración de IA con valores por defecto, deshabilitada y sin clave
    await tx.insert(llmSettings).values({
      organizationId: org.id,
      provider: (process.env.LLM_PROVIDER ?? 'anthropic') as 'anthropic' | 'openai' | 'ollama',
      model: process.env.LLM_MODEL ?? 'claude-sonnet-5',
      baseUrl: process.env.LLM_BASE_URL || null,
      maxOutputTokens: Number(process.env.LLM_MAX_OUTPUT_TOKENS ?? 1500),
      isEnabled: false,
      updatedBy: facilitator.id,
    });

    console.log('✓ Configuración de IA inicial (deshabilitada, sin clave)');
  });

  console.log('\nSemilla completada. Inicia sesión con:');
  console.log(`  usuario:    ${username}`);
  console.log(`  contraseña: ${password}`);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL no está definida. Copia .env.example a .env.local.');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    await seed(pool);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('\n✗ Error al sembrar:', error);
  process.exit(1);
});
