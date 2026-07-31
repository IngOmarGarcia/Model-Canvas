import { boolean, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { llmProviderEnum } from './enums';
import { organizations } from './organizations';
import { profiles } from './profiles';

/**
 * Configuración del proveedor de IA, una fila por organización.
 * `apiKeyCiphertext` se cifra con AES-256-GCM y NUNCA se devuelve al cliente:
 * la UI solo recibe { hasApiKey, apiKeyLast4 }.
 */
export const llmSettings = pgTable(
  'llm_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    provider: llmProviderEnum('provider').notNull().default('anthropic'),
    model: text('model').notNull(),
    baseUrl: text('base_url'),
    apiKeyCiphertext: text('api_key_ciphertext'),
    apiKeyLast4: text('api_key_last4'),
    maxOutputTokens: integer('max_output_tokens').notNull().default(1500),
    customInstructions: text('custom_instructions'),
    isEnabled: boolean('is_enabled').notNull().default(false),
    lastTestedAt: timestamp('last_tested_at', { withTimezone: true }),
    lastTestOk: boolean('last_test_ok'),
    updatedBy: uuid('updated_by').references(() => profiles.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex('llm_settings_org_uq').on(t.organizationId)],
);

export type LlmSettings = typeof llmSettings.$inferSelect;
export type NewLlmSettings = typeof llmSettings.$inferInsert;
