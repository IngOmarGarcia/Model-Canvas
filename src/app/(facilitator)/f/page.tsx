import type { Metadata } from 'next';
import Link from 'next/link';

import { ActivityFeed } from '@/components/facilitator/activity-feed';
import { StatCard } from '@/components/facilitator/stat-card';
import { PageHeader } from '@/components/layout/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { getWorkspaceContext } from '@/server/services/context.service';
import { listRecentActivity } from '@/server/services/participants.service';
import { getSessionSummary } from '@/server/services/summary.service';
import { requireRole } from '@/server/session';

export const metadata: Metadata = { title: 'Resumen' };

export default async function FacilitatorDashboardPage() {
  const user = await requireRole('facilitator');
  const context = await getWorkspaceContext(user);

  const [summary, activity] = context.trainingSessionId
    ? await Promise.all([
        getSessionSummary(context.trainingSessionId),
        listRecentActivity(user, context.trainingSessionId),
      ])
    : [null, []];

  return (
    <>
      <PageHeader
        title={context.trainingName ?? 'Resumen'}
        description={context.organizationName}
        action={
          <Button asChild variant="outline">
            <Link href="/f/usuarios">Agregar participantes</Link>
          </Button>
        }
      />

      {!context.trainingSessionId && (
        <Alert variant="accent" className="mb-6">
          <AlertTitle>Aún no hay una capacitación</AlertTitle>
          <AlertDescription>
            La semilla crea una capacitación en borrador. La gestión completa llega en la Fase 4.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon="Users"
          label="Participantes"
          value={summary?.participants ?? 0}
          hint="Inscritos en la capacitación"
        />
        <StatCard
          icon="Activity"
          label="Activos ahora"
          value={summary?.activeParticipants ?? 0}
          hint="Vistos en los últimos 5 minutos"
        />
        <StatCard
          icon="Grid3x3"
          label="Lienzos iniciados"
          value={summary?.startedCanvases ?? 0}
          hint="Con al menos una nota"
        />
        <StatCard
          icon="ListChecks"
          label="Lienzos terminados"
          value={summary?.completedCanvases ?? 0}
          hint={`Avance promedio ${summary?.averageProgress ?? 0} %`}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold">Actividad reciente</h2>
          <ActivityFeed items={activity} />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold">Accesos rápidos</h2>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/f/monitoreo">Abrir monitoreo</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/f/lienzo">Mi lienzo</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/f/metodologia">Metodología</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/f/configuracion">Configuración</Link>
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
