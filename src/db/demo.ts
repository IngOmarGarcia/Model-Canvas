import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

import { hash } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { MODULES_IN_ORDER } from '../lib/bmc/modules';

import * as schema from './schema';
import {
  canvasModules,
  canvases,
  profiles,
  stickyNotes,
  trainingParticipants,
  trainingSessions,
} from './schema';

/**
 * Datos de demostración para ensayar una capacitación sin dar de alta a nadie
 * a mano. Crea participantes con avance distinto para que el monitoreo se vea
 * poblado. Requiere haber corrido `npm run db:seed` antes.
 *
 * Las contraseñas son fijas y conocidas: NO usar en un entorno real.
 */
const DEMO_PASSWORD = 'Demo2026!';

const PARTICIPANTES = [
  {
    fullName: 'María Fernanda Ruiz',
    username: 'demo.maria',
    notas: {
      customer_segments: ['Estudiantes autodidactas', 'Empresas que capacitan a su personal'],
      value_propositions: ['Capacitación práctica en 4 horas', 'Certificado descargable'],
      channels: ['Redes sociales', 'Sitio web propio'],
      customer_relationships: ['Autoservicio con soporte por chat'],
      revenue_streams: ['Suscripción mensual', 'Cursos individuales'],
      key_resources: ['Plataforma web', 'Equipo de instructores'],
      key_activities: ['Producción de contenido', 'Operar la plataforma'],
      key_partnerships: ['Universidades locales'],
      cost_structure: ['Servidores', 'Honorarios de instructores'],
    },
  },
  {
    fullName: 'Jorge Luis Castro',
    username: 'demo.jorge',
    notas: {
      customer_segments: ['Cafeterías de barrio'],
      value_propositions: ['Entrega de grano fresco cada semana'],
      channels: ['Visitas comerciales', 'WhatsApp'],
      revenue_streams: ['Venta por kilo'],
      key_resources: ['Camioneta de reparto'],
    },
  },
  {
    fullName: 'Sofía Nava',
    username: 'demo.sofia',
    notas: {
      customer_segments: ['Personas que rentan bicicleta por hora'],
      value_propositions: ['Renta sin trámites por app'],
    },
  },
  {
    fullName: 'Diego Ramírez',
    username: 'demo.diego',
    notas: {},
  },
];

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no está definida.');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  try {
    const [facilitator] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.role, 'facilitator'))
      .limit(1);

    if (!facilitator) {
      throw new Error('No hay facilitador. Ejecuta primero: npm run db:seed');
    }

    const [training] = await db
      .select()
      .from(trainingSessions)
      .where(eq(trainingSessions.facilitatorId, facilitator.id))
      .limit(1);

    if (!training) throw new Error('No hay capacitación. Ejecuta primero: npm run db:seed');

    const passwordHash = await hash(DEMO_PASSWORD);

    for (const persona of PARTICIPANTES) {
      const [existing] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.username, persona.username))
        .limit(1);

      if (existing) {
        console.log(`· ${persona.username} ya existe, se omite`);
        continue;
      }

      await db.transaction(async (tx) => {
        const [profile] = await tx
          .insert(profiles)
          .values({
            organizationId: facilitator.organizationId,
            username: persona.username,
            fullName: persona.fullName,
            passwordHash,
            role: 'participant',
            isActive: true,
            mustChangePassword: false,
          })
          .returning();

        await tx.insert(trainingParticipants).values({
          trainingSessionId: training.id,
          profileId: profile.id,
          status: 'active',
          lastSeenAt: new Date(),
        });

        const [canvas] = await tx
          .insert(canvases)
          .values({
            trainingSessionId: training.id,
            ownerId: profile.id,
            kind: 'participant',
            title: `Lienzo de ${profile.fullName}`,
          })
          .returning();

        const modules = await tx
          .insert(canvasModules)
          .values(
            MODULES_IN_ORDER.map((m) => ({
              canvasId: canvas.id,
              moduleKey: m.key,
              orderIndex: m.order,
            })),
          )
          .returning();

        const notas = persona.notas as Record<string, string[]>;
        let total = 0;
        let order = 1;

        for (const modulo of modules) {
          const textos = notas[modulo.moduleKey] ?? [];
          if (textos.length === 0) continue;

          await tx.insert(stickyNotes).values(
            textos.map((texto, index) => ({
              canvasId: canvas.id,
              canvasModuleId: modulo.id,
              moduleKey: modulo.moduleKey,
              authorId: profile.id,
              text: texto,
              color: (['yellow', 'blue', 'teal', 'green'] as const)[index % 4],
              positionX: 0.05 + (index % 3) * 0.3,
              positionY: 0.08 + Math.floor(index / 3) * 0.3,
              orderIndex: order++,
            })),
          );

          await tx
            .update(canvasModules)
            .set({ noteCount: textos.length })
            .where(eq(canvasModules.id, modulo.id));

          total += textos.length;
        }

        const filled = Object.keys(notas).length;

        await tx
          .update(canvases)
          .set({
            noteCount: total,
            filledModules: filled,
            status: filled === 9 ? 'completed' : total > 0 ? 'in_progress' : 'not_started',
            lastActivityAt: new Date(),
          })
          .where(eq(canvases.id, canvas.id));

        console.log(`✓ ${persona.fullName} (${persona.username}) — ${total} notas, ${filled}/9 módulos`);
      });
    }

    console.log(`\nParticipantes de demostración listos. Contraseña de todos: ${DEMO_PASSWORD}`);
    console.log('Para quitarlos: npm run db:demo:clean\n');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('\n✗ Error al crear los datos de demostración:', error);
  process.exit(1);
});
