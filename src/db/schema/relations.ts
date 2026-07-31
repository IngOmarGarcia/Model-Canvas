import { relations } from 'drizzle-orm';

import { canvasAnalyses } from './analyses';
import { canvasModules, canvases } from './canvases';
import { activityEvents } from './events';
import { llmSettings } from './llm';
import { stickyNotes } from './notes';
import { organizations } from './organizations';
import { profiles } from './profiles';
import { trainingParticipants, trainingSessions } from './training';

export const organizationsRelations = relations(organizations, ({ many, one }) => ({
  profiles: many(profiles),
  trainingSessions: many(trainingSessions),
  llmSettings: one(llmSettings),
}));

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [profiles.organizationId],
    references: [organizations.id],
  }),
  participations: many(trainingParticipants),
  canvases: many(canvases),
}));

export const trainingSessionsRelations = relations(trainingSessions, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [trainingSessions.organizationId],
    references: [organizations.id],
  }),
  facilitator: one(profiles, {
    fields: [trainingSessions.facilitatorId],
    references: [profiles.id],
  }),
  participants: many(trainingParticipants),
  canvases: many(canvases),
}));

export const trainingParticipantsRelations = relations(trainingParticipants, ({ one }) => ({
  trainingSession: one(trainingSessions, {
    fields: [trainingParticipants.trainingSessionId],
    references: [trainingSessions.id],
  }),
  profile: one(profiles, {
    fields: [trainingParticipants.profileId],
    references: [profiles.id],
  }),
}));

export const canvasesRelations = relations(canvases, ({ one, many }) => ({
  trainingSession: one(trainingSessions, {
    fields: [canvases.trainingSessionId],
    references: [trainingSessions.id],
  }),
  owner: one(profiles, { fields: [canvases.ownerId], references: [profiles.id] }),
  modules: many(canvasModules),
  notes: many(stickyNotes),
  analyses: many(canvasAnalyses),
}));

export const canvasModulesRelations = relations(canvasModules, ({ one, many }) => ({
  canvas: one(canvases, { fields: [canvasModules.canvasId], references: [canvases.id] }),
  notes: many(stickyNotes),
}));

export const stickyNotesRelations = relations(stickyNotes, ({ one }) => ({
  canvas: one(canvases, { fields: [stickyNotes.canvasId], references: [canvases.id] }),
  module: one(canvasModules, {
    fields: [stickyNotes.canvasModuleId],
    references: [canvasModules.id],
  }),
  author: one(profiles, { fields: [stickyNotes.authorId], references: [profiles.id] }),
}));

export const llmSettingsRelations = relations(llmSettings, ({ one }) => ({
  organization: one(organizations, {
    fields: [llmSettings.organizationId],
    references: [organizations.id],
  }),
}));

export const canvasAnalysesRelations = relations(canvasAnalyses, ({ one }) => ({
  canvas: one(canvases, { fields: [canvasAnalyses.canvasId], references: [canvases.id] }),
  trainingSession: one(trainingSessions, {
    fields: [canvasAnalyses.trainingSessionId],
    references: [trainingSessions.id],
  }),
  requester: one(profiles, { fields: [canvasAnalyses.requestedBy], references: [profiles.id] }),
}));

export const activityEventsRelations = relations(activityEvents, ({ one }) => ({
  trainingSession: one(trainingSessions, {
    fields: [activityEvents.trainingSessionId],
    references: [trainingSessions.id],
  }),
  canvas: one(canvases, { fields: [activityEvents.canvasId], references: [canvases.id] }),
  actor: one(profiles, { fields: [activityEvents.actorId], references: [profiles.id] }),
}));
