import type { Metadata } from 'next';

import { LoginForm } from '@/components/auth/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Iniciar sesión' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirigir?: string }>;
}) {
  const { redirigir } = await searchParams;

  // Solo se acepta una ruta interna: evita redirección abierta a otro dominio.
  const redirectTo = redirigir?.startsWith('/') && !redirigir.startsWith('//') ? redirigir : undefined;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Canvas BMC</CardTitle>
        <CardDescription>
          Ingresa con las credenciales que te entregó el facilitador.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm redirectTo={redirectTo} />
      </CardContent>
    </Card>
  );
}
