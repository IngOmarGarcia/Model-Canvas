import type { Metadata } from 'next';

import { CanvasBoard } from '@/components/canvas/canvas-board';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { porcentajeAvance } from '@/lib/utils';
import { getOrCreateOwnCanvas } from '@/server/services/canvas.service';
import { getWorkspaceContext } from '@/server/services/context.service';
import { requireRole } from '@/server/session';

export const metadata: Metadata = { title: 'Mi lienzo' };

export default async function ParticipantCanvasPage() {
  const user = await requireRole('participant');
  const context = await getWorkspaceContext(user);

  if (!context.trainingSessionId) {
    return (
      <>
        <PageHeader title="Mi Business Model Canvas" />
        <Alert variant="accent">
          <AlertTitle>Todavía no estás inscrito en una capacitación</AlertTitle>
          <AlertDescription>
            Pídele al facilitador que te asigne a una para poder abrir tu lienzo.
          </AlertDescription>
        </Alert>
      </>
    );
  }

  const canvas = await getOrCreateOwnCanvas(user, context.trainingSessionId);

  return (
    <>
      <PageHeader
        title="Mi Business Model Canvas"
        description="Empieza por Segmentos de mercado y avanza en el orden numerado."
        action={
          <Badge variant="secondary">
            {porcentajeAvance(canvas.filledModules)} % · {canvas.noteCount}{' '}
            {canvas.noteCount === 1 ? 'nota' : 'notas'}
          </Badge>
        }
      />
      <CanvasBoard canvasId={canvas.id} initialNotes={canvas.notes} editable />
    </>
  );
}
