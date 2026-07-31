import type { Metadata } from 'next';

import { PageHeader } from '@/components/layout/page-header';
import { UsersManager } from '@/components/users/users-manager';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getWorkspaceContext } from '@/server/services/context.service';
import { listParticipants } from '@/server/services/participants.service';
import { requireRole } from '@/server/session';

export const metadata: Metadata = { title: 'Usuarios' };

export default async function UsersPage() {
  const user = await requireRole('facilitator');
  const context = await getWorkspaceContext(user);

  if (!context.trainingSessionId) {
    return (
      <>
        <PageHeader title="Usuarios" />
        <Alert variant="accent">
          <AlertTitle>Aún no hay una capacitación</AlertTitle>
          <AlertDescription>
            Los participantes se dan de alta dentro de una capacitación.
          </AlertDescription>
        </Alert>
      </>
    );
  }

  const participants = await listParticipants(user, context.trainingSessionId);

  return (
    <>
      <PageHeader
        title="Usuarios"
        description={`Participantes de "${context.trainingName}" y sus credenciales temporales.`}
      />
      <UsersManager participants={participants} />
    </>
  );
}
