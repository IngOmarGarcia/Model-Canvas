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

export default async function FacilitatorCanvasPage() {
  const user = await requireRole('facilitator');
  const context = await getWorkspaceContext(user);

  if (!context.trainingSessionId) {
    return (
      <>
        <PageHeader title="Lienzo del facilitador" />
        <Alert variant="accent">
          <AlertTitle>Aún no hay una capacitación</AlertTitle>
          <AlertDescription>
            El lienzo se crea junto con la capacitación. La gestión de capacitaciones llega en la
            Fase 4.
          </AlertDescription>
        </Alert>
      </>
    );
  }

  const canvas = await getOrCreateOwnCanvas(user, context.trainingSessionId);

  return (
    <>
      <PageHeader
        title="Lienzo del facilitador"
        description="Distribución tradicional de los nueve bloques del Business Model Canvas."
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
