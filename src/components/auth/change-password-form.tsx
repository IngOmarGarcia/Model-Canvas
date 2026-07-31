'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { changePasswordSchema, type ChangePasswordInput } from '@/lib/validation/auth';
import { changePasswordAction } from '@/server/actions/auth.actions';

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const [formError, setFormError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  async function onSubmit(values: ChangePasswordInput) {
    setFormError(null);

    const result = await changePasswordAction(values);

    if (!result.ok) {
      if (result.fieldErrors?.currentPassword) {
        setError('currentPassword', { message: result.fieldErrors.currentPassword[0] });
      } else {
        setFormError(result.error);
      }
      return;
    }

    // La contraseña ya cambió: el JWT en la cookie quedó obsoleto (sigue
    // diciendo mustChangePassword). En vez de parchearlo se destruye la sesión
    // y se obliga a entrar de nuevo con la credencial nueva.
    toast.success('Contraseña actualizada. Inicia sesión con tu nueva contraseña.');
    setLeaving(true);
    await signOut({ redirectTo: '/login' });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {forced && (
        <Alert variant="accent">
          <AlertDescription>
            Estás usando una contraseña temporal. Define una propia para continuar.
          </AlertDescription>
        </Alert>
      )}

      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="currentPassword">Contraseña actual</Label>
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.currentPassword)}
          {...register('currentPassword')}
        />
        {errors.currentPassword && (
          <p className="text-destructive text-sm">{errors.currentPassword.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">Nueva contraseña</Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.newPassword)}
          {...register('newPassword')}
        />
        {errors.newPassword && (
          <p className="text-destructive text-sm">{errors.newPassword.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirmPassword)}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p className="text-destructive text-sm">{errors.confirmPassword.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting || leaving}>
        {(isSubmitting || leaving) && <Loader2 className="size-4 animate-spin" />}
        {isSubmitting ? 'Guardando…' : leaving ? 'Redirigiendo…' : 'Guardar contraseña'}
      </Button>

      {/* Salida siempre disponible: con contraseña temporal el middleware fija
          al usuario en esta pantalla, así que sin esto no habría forma de salir. */}
      {forced ? (
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={isSubmitting || leaving}
          onClick={() => {
            setLeaving(true);
            void signOut({ redirectTo: '/login' });
          }}
        >
          Cerrar sesión
        </Button>
      ) : (
        <Button asChild type="button" variant="ghost" className="w-full">
          <Link href="/">Cancelar</Link>
        </Button>
      )}
    </form>
  );
}
