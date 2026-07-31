import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PresentationView, type PresentableCanvas } from '@/components/canvas/presentation-view';
import { getCanvasById, getOrCreateOwnCanvas } from '@/server/services/canvas.service';
import { getWorkspaceContext } from '@/server/services/context.service';
import { listParticipants } from '@/server/services/participants.service';
import { requireRole } from '@/server/session';

export const metadata: Metadata = { title: 'Presentación' };

export default async function PresentationPage({
  params,
}: {
  params: Promise<{ canvasId: string }>;
}) {
  const { canvasId } = await params;

  const user = await requireRole('facilitator');
  const context = await getWorkspaceContext(user);
  if (!context.trainingSessionId) notFound();

  const [own, participants] = await Promise.all([
    getOrCreateOwnCanvas(user, context.trainingSessionId),
    listParticipants(user, context.trainingSessionId),
  ]);

  // Lienzos proyectables: el propio y los de los participantes de ESTA
  // capacitación. Un id fuera de esta lista devuelve 404.
  const available: PresentableCanvas[] = [
    { id: own.id, label: 'Lienzo del facilitador', kind: 'facilitator' },
    ...participants
      .filter((row) => row.canvasId)
      .map((row) => ({
        id: row.canvasId as string,
        label: row.fullName,
        kind: 'participant' as const,
      })),
  ];

  const selected = available.find((item) => item.id === canvasId);
  if (!selected) notFound();

  const canvas = selected.id === own.id ? own : await getCanvasById(selected.id);
  if (!canvas) notFound();

  return (
    <PresentationView
      canvasId={canvas.id}
      notes={canvas.notes}
      title={selected.label}
      available={available}
    />
  );
}
