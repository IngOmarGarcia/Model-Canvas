import { pgEnum } from 'drizzle-orm/pg-core';

// Importaciones relativas a propósito: drizzle-kit carga este archivo fuera de
// Next y no siempre resuelve el alias "@/".
import { MODULE_KEYS, type ModuleKey } from '../../lib/bmc/modules';
import { NOTE_COLOR_KEYS } from '../../lib/colors';

export const userRoleEnum = pgEnum('user_role', ['facilitator', 'participant']);
export type UserRole = (typeof userRoleEnum.enumValues)[number];

export const sessionStatusEnum = pgEnum('session_status', ['draft', 'active', 'closed']);
export type SessionStatus = (typeof sessionStatusEnum.enumValues)[number];

export const participantStatusEnum = pgEnum('participant_status', [
  'invited',
  'active',
  'disabled',
]);
export type ParticipantStatus = (typeof participantStatusEnum.enumValues)[number];

export const canvasKindEnum = pgEnum('canvas_kind', [
  'participant',
  'facilitator',
  'consolidated',
]);
export type CanvasKind = (typeof canvasKindEnum.enumValues)[number];

export const canvasStatusEnum = pgEnum('canvas_status', [
  'not_started',
  'in_progress',
  'completed',
]);
export type CanvasStatus = (typeof canvasStatusEnum.enumValues)[number];

/**
 * Derivado de lib/bmc/modules.ts: una sola fuente de verdad para los nueve módulos.
 * El cast convierte la tupla `readonly` en la mutable que pide pgEnum, sin
 * perder los tipos literales.
 */
export const moduleKeyEnum = pgEnum(
  'module_key',
  MODULE_KEYS as unknown as [ModuleKey, ...ModuleKey[]],
);

/** Derivado de lib/colors.ts. */
export const noteColorEnum = pgEnum('note_color', NOTE_COLOR_KEYS);

export const llmProviderEnum = pgEnum('llm_provider', [
  'anthropic',
  'openai',
  'ollama',
  'gemini',
]);
export type LlmProviderKey = (typeof llmProviderEnum.enumValues)[number];

export const analysisScopeEnum = pgEnum('analysis_scope', ['canvas', 'session']);
export type AnalysisScope = (typeof analysisScopeEnum.enumValues)[number];

export const analysisStatusEnum = pgEnum('analysis_status', ['pending', 'completed', 'failed']);
export type AnalysisStatus = (typeof analysisStatusEnum.enumValues)[number];

export const themeKeyEnum = pgEnum('theme_key', ['principal', 'oscuro', 'creativo']);
export type ThemeKey = (typeof themeKeyEnum.enumValues)[number];
