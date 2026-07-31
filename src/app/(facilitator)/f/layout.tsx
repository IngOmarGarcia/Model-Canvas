import { AppShell } from '@/components/layout/app-shell';
import { FACILITATOR_NAV } from '@/lib/navigation';
import { getWorkspaceContext } from '@/server/services/context.service';
import { requireRole } from '@/server/session';

export default async function FacilitatorLayout({ children }: { children: React.ReactNode }) {
  // La ruta no es la autorización: se vuelve a exigir el rol en el servidor.
  const user = await requireRole('facilitator');
  const context = await getWorkspaceContext(user);

  return (
    <AppShell
      items={FACILITATOR_NAV}
      organizationName={context.organizationName}
      trainingName={context.trainingName}
      fullName={user.fullName}
      username={user.username}
      roleLabel="Facilitador"
    >
      {children}
    </AppShell>
  );
}
