import type { Metadata } from 'next';

import { AnalysisPanel } from '@/components/analysis/analysis-panel';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getLatestAnalysis } from '@/server/services/analysis.service';
import { getWorkspaceContext } from '@/server/services/context.service';
import {
  describeUnavailability,
  getLlmSettings,
  isConfigured,
} from '@/server/services/llm-settings.service';
import { requireRole } from '@/server/session';

export const metadata: Metadata = { title: 'Análisis general' };

export default async function SessionAnalysisPage() {
  const user = await requireRole('facilitator');
  const context = await getWorkspaceContext(user);

  if (!context.trainingSessionId) {
    return (
      <>
        <PageHeader title="Análisis general" />
        <Alert variant="accent">
          <AlertTitle>Aún no hay una capacitación</AlertTitle>
          <AlertDescription>Crea la capacitación y da de alta participantes.</AlertDescription>
        </Alert>
      </>
    );
  }

  const [settings, latest] = await Promise.all([
    getLlmSettings(user),
    getLatestAnalysis(user, 'session'),
  ]);

  return (
    <>
      <PageHeader
        title="Análisis general"
        description="Patrones comunes y vacíos recurrentes en los lienzos de la capacitación."
      />

      {isConfigured(settings) ? (
        <AnalysisPanel
          initial={latest}
          scope="session"
          canForce
          emptyHint="Los lienzos se envían de forma anónima: el modelo no recibe nombres ni correos."
        />
      ) : (
        <Alert variant="accent">
          <AlertTitle>El análisis por IA no está disponible</AlertTitle>
          <AlertDescription>{describeUnavailability(settings)}</AlertDescription>
        </Alert>
      )}
    </>
  );
}
