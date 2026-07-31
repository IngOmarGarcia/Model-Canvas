import { redirect } from 'next/navigation';

import { homeForRole } from '@/lib/navigation';
import { getCurrentUser } from '@/server/session';

/** Raíz: redirige a la pantalla correspondiente al rol. */
export default async function RootPage() {
  const user = await getCurrentUser();
  redirect(user ? homeForRole(user.role) : '/login');
}
