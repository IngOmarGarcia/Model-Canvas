import type { Metadata } from 'next';

import { AnalysisPanel } from '@/components/analysis/analysis-panel';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getLatestAnalysis } from '@/server/services/analysis.service';
import { getOrCreateOwnCanvas } from '@/server/services/canvas.service';
import { getWorkspaceContext } from '@/server/services/context.service';
import { isAnalysisAvailable } from '@/server/services/llm-settings.service';
import { requireRole } from '@/server/session';

export const metadata: Metadata = { title: 'Análisis' };

export default async function ParticipantAnalysisPage() {
  const user = await requireRole('participant');
  const context = await getWorkspaceContext(user);

  if (!context.trainingSessionId) {
    return (
      <>
        <PageHeader title="Análisis de mi lienzo" />
        <Alert variant="accent">
          <AlertTitle>Todavía no estás inscrito en una capacitación</AlertTitle>
          <AlertDescription>Pídele al facilitador que te asigne a una.</AlertDescription>
        </Alert>
      </>
    );
  }

  const canvas = await getOrCreateOwnCanvas(user, context.trainingSessionId);

  // El participante no puede consultar la configuración de IA: solo recibe si
  // el análisis está disponible o no.
  const [latest, available] = await Promise.all([
    getLatestAnalysis(user, 'canvas', canvas.id),
    isAnalysisAvailable(user.organizationId),
  ]);

  return (
    <>
      <PageHeader
        title="Análisis de mi lienzo"
        description="Retroalimentación generada por inteligencia artificial sobre tu avance."
      />

      {/*
        Aunque no se pueda pedir un análisis nuevo, el panel sigue en pie: explica
        la situación y conserva el último resultado guardado. El participante no
        recibe detalles del proveedor ni del entorno (docs/03, regla 6).
      */}
      <AnalysisPanel
        initial={latest}
        scope="canvas"
        canvasId={canvas.id}
        unavailable={
          available
            ? undefined
            : 'El facilitador todavía no ha activado el análisis por inteligencia artificial, o el servicio no está disponible en este momento. Puedes seguir trabajando en tu lienzo con normalidad e intentarlo más tarde.'
        }
        emptyHint={
          canvas.noteCount === 0
            ? 'Agrega notas a tu lienzo y después solicita el análisis.'
            : 'Solicita uno para recibir retroalimentación sobre tu avance.'
        }
      />
    </>
  );
}
