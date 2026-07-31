import { AppShell } from '@/components/layout/app-shell';
import { PresenceHeartbeat } from '@/components/layout/presence-heartbeat';
import { PARTICIPANT_NAV } from '@/lib/navigation';
import { getWorkspaceContext } from '@/server/services/context.service';
import { requireRole } from '@/server/session';

export default async function ParticipantLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('participant');
  const context = await getWorkspaceContext(user);

  return (
    <AppShell
      items={PARTICIPANT_NAV}
      organizationName={context.organizationName}
      trainingName={context.trainingName}
      fullName={user.fullName}
      username={user.username}
      roleLabel="Participante"
    >
      <PresenceHeartbeat />
      {children}
    </AppShell>
  );
}
