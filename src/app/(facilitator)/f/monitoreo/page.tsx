import type { Metadata } from 'next';

import { MonitoringView } from '@/components/facilitator/monitoring-view';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { latestCursor } from '@/server/services/events.service';
import { getWorkspaceContext } from '@/server/services/context.service';
import { listParticipants } from '@/server/services/participants.service';
import { requireRole } from '@/server/session';

export const metadata: Metadata = { title: 'Monitoreo' };

export default async function MonitoringPage() {
  const user = await requireRole('facilitator');
  const context = await getWorkspaceContext(user);

  if (!context.trainingSessionId) {
    return (
      <>
        <PageHeader title="Monitoreo en tiempo real" />
        <Alert variant="accent">
          <AlertTitle>Aún no hay una capacitación</AlertTitle>
          <AlertDescription>Crea la capacitación y da de alta participantes.</AlertDescription>
        </Alert>
      </>
    );
  }

  // Estado inicial por RSC; a partir de aquí solo llegan deltas por evento.
  const [participants, cursor] = await Promise.all([
    listParticipants(user, context.trainingSessionId),
    latestCursor(context.trainingSessionId),
  ]);

  return (
    <>
      <PageHeader
        title="Monitoreo en tiempo real"
        description="Avance de cada participante durante la capacitación."
      />
      <MonitoringView
        trainingSessionId={context.trainingSessionId}
        initialParticipants={participants}
        initialCursor={cursor}
      />
    </>
  );
}
