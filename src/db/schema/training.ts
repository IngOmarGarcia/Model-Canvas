import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { participantStatusEnum, sessionStatusEnum } from './enums';
import { organizations } from './organizations';
import { profiles } from './profiles';

export const trainingSessions = pgTable(
  'training_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    facilitatorId: uuid('facilitator_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    description: text('description'),
    status: sessionStatusEnum('status').notNull().default('draft'),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index('training_sessions_org_status_idx').on(t.organizationId, t.status)],
);

/**
 * Inscripción de un participante en una capacitación.
 *
 * `tempPasswordCiphertext` guarda la contraseña temporal cifrada (AES-256-GCM)
 * únicamente para poder copiarla o descargarla antes de que se use. Se borra en
 * el primer inicio de sesión. Decisión y compromiso: docs/09-seguridad.md.
 */
export const trainingParticipants = pgTable(
  'training_participants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    trainingSessionId: uuid('training_session_id')
      .notNull()
      .references(() => trainingSessions.id, { onDelete: 'cascade' }),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    status: participantStatusEnum('status').notNull().default('invited'),
    tempPasswordCiphertext: text('temp_password_ciphertext'),
    credentialsIssuedAt: timestamp('credentials_issued_at', { withTimezone: true }),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('training_participants_session_profile_uq').on(t.trainingSessionId, t.profileId),
    index('training_participants_session_status_idx').on(t.trainingSessionId, t.status),
  ],
);

export type TrainingSession = typeof trainingSessions.$inferSelect;
export type NewTrainingSession = typeof trainingSessions.$inferInsert;
export type TrainingParticipant = typeof trainingParticipants.$inferSelect;
export type NewTrainingParticipant = typeof trainingParticipants.$inferInsert;
