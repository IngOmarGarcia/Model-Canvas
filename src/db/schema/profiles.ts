import { sql } from 'drizzle-orm';
import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { userRoleEnum } from './enums';
import { organizations } from './organizations';

/**
 * Cuentas de acceso. `username` y `email` se guardan siempre normalizados en
 * minúsculas desde la aplicación, de modo que un índice único simple basta
 * (evita depender de la extensión citext en el servidor de base de datos).
 */
export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    username: text('username').notNull(),
    email: text('email'),
    fullName: text('full_name').notNull(),
    passwordHash: text('password_hash').notNull(),
    role: userRoleEnum('role').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    mustChangePassword: boolean('must_change_password').notNull().default(false),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('profiles_org_username_uq').on(t.organizationId, t.username),
    uniqueIndex('profiles_org_email_uq')
      .on(t.organizationId, t.email)
      .where(sql`${t.email} is not null`),
    index('profiles_org_role_idx').on(t.organizationId, t.role),
  ],
);

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
