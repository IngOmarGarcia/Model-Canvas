import { bigserial, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Intentos de inicio de sesión fallidos, para limitar la fuerza bruta
 * (docs/09: 10 por usuario y 30 por IP en 15 minutos).
 *
 * Vive en base de datos y no en memoria del proceso para que el límite siga
 * valiendo con varias instancias desplegadas. Las filas viejas se purgan en
 * cada escritura, así que la tabla no crece.
 */
export const loginAttempts = pgTable(
  'login_attempts',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    /** "user:<username>" o "ip:<dirección>". No se guarda la contraseña. */
    subject: text('subject').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('login_attempts_subject_created_idx').on(t.subject, t.createdAt)],
);

export type LoginAttempt = typeof loginAttempts.$inferSelect;
