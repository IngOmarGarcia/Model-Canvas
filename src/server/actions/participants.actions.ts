'use server';

import { revalidatePath } from 'next/cache';

import { fail, fromZodError, ok, type ActionResult } from '@/lib/action-result';
import {
  bulkParticipantsSchema,
  createParticipantSchema,
  parseBulkRows,
  participantIdSchema,
  setParticipantActiveSchema,
} from '@/lib/validation/participants';

import * as participants from '../services/participants.service';
import { NotAllowedError, type IssuedCredentials } from '../services/participants.service';
import { getWorkspaceContext } from '../services/context.service';
import { requireRole, type CurrentUser } from '../session';

/**
 * Server Actions de administración de participantes.
 * Todas exigen rol de facilitador y que la capacitación sea suya; la
 * comprobación real vive en el servicio, resuelta con un join.
 */
async function withSession(): Promise<{ user: CurrentUser; trainingSessionId: string } | null> {
  const user = await requireRole('facilitator');
  const context = await getWorkspaceContext(user);
  if (!context.trainingSessionId) return null;
  return { user, trainingSessionId: context.trainingSessionId };
}

async function guard<T>(run: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return ok(await run());
  } catch (error) {
    if (error instanceof NotAllowedError) return fail(error.message);
    console.error('[participants.actions]', error);
    return fail('No se pudo completar la operación. Inténtalo de nuevo.');
  }
}

function refresh() {
  revalidatePath('/f/usuarios');
  revalidatePath('/f/monitoreo');
  revalidatePath('/f');
}

export async function createParticipantAction(
  input: unknown,
): Promise<ActionResult<IssuedCredentials[]>> {
  const session = await withSession();
  if (!session) return fail('Todavía no hay una capacitación activa.');

  const parsed = createParticipantSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error.issues);

  const result = await guard(async () => [
    await participants.createParticipant(session.user, session.trainingSessionId, parsed.data),
  ]);

  if (result.ok) refresh();
  return result;
}

export async function createParticipantsBulkAction(
  input: unknown,
): Promise<ActionResult<{ credentials: IssuedCredentials[]; skipped: number }>> {
  const session = await withSession();
  if (!session) return fail('Todavía no hay una capacitación activa.');

  const parsed = bulkParticipantsSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error.issues);

  const { rows, skipped } = parseBulkRows(parsed.data.raw);
  if (rows.length === 0) return fail('No se reconoció ningún nombre válido.');

  const result = await guard(async () => ({
    credentials: await participants.createParticipants(
      session.user,
      session.trainingSessionId,
      rows,
    ),
    skipped,
  }));

  if (result.ok) refresh();
  return result;
}

export async function resetPasswordAction(
  input: unknown,
): Promise<ActionResult<IssuedCredentials[]>> {
  const user = await requireRole('facilitator');

  const parsed = participantIdSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error.issues);

  const result = await guard(async () => [
    await participants.resetParticipantPassword(user, parsed.data.profileId),
  ]);

  if (result.ok) refresh();
  return result;
}

export async function setParticipantActiveAction(input: unknown): Promise<ActionResult<void>> {
  const user = await requireRole('facilitator');

  const parsed = setParticipantActiveSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error.issues);

  const result = await guard(() =>
    participants.setParticipantActive(user, parsed.data.profileId, parsed.data.isActive),
  );

  if (result.ok) refresh();
  return result;
}

export async function deleteParticipantAction(input: unknown): Promise<ActionResult<void>> {
  const user = await requireRole('facilitator');

  const parsed = participantIdSchema.safeParse(input);
  if (!parsed.success) return fromZodError(parsed.error.issues);

  const result = await guard(() => participants.deleteParticipant(user, parsed.data.profileId));

  if (result.ok) refresh();
  return result;
}

/** Latido de presencia del participante (docs/07). */
export async function heartbeatAction(): Promise<void> {
  try {
    const user = await requireRole('participant');
    await participants.touchPresence(user);
  } catch {
    // La presencia es informativa: si falla, no se interrumpe al participante.
  }
}
