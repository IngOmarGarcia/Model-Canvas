import type { Metadata } from 'next';

import { ChangePasswordForm } from '@/components/auth/change-password-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireUser } from '@/server/session';

export const metadata: Metadata = { title: 'Cambiar contraseña' };

export default async function ChangePasswordPage() {
  const user = await requireUser();

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Cambiar contraseña</CardTitle>
        <CardDescription>
          {user.mustChangePassword
            ? 'Define tu contraseña personal para entrar a la capacitación.'
            : 'Actualiza la contraseña de tu cuenta.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChangePasswordForm forced={user.mustChangePassword} />
      </CardContent>
    </Card>
  );
}
