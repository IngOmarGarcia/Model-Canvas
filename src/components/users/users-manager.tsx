'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Download,
  KeyRound,
  Loader2,
  MoreVertical,
  Trash2,
  UserPlus,
  UserX,
  Users as UsersIcon,
} from 'lucide-react';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { porcentajeAvance, tiempoRelativo } from '@/lib/utils';
import {
  BULK_MAX_ROWS,
  bulkParticipantsSchema,
  createParticipantSchema,
  parseBulkRows,
  type BulkParticipantsInput,
  type CreateParticipantInput,
} from '@/lib/validation/participants';
import {
  createParticipantAction,
  createParticipantsBulkAction,
  deleteParticipantAction,
  resetPasswordAction,
  setParticipantActiveAction,
} from '@/server/actions/participants.actions';
import type { IssuedCredentials, ParticipantRow } from '@/server/services/participants.service';

import { CredentialsDialog } from './credentials-dialog';

export function UsersManager({ participants }: { participants: ParticipantRow[] }) {
  const [credentials, setCredentials] = useState<IssuedCredentials[] | null>(null);
  const [singleOpen, setSingleOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [toDelete, setToDelete] = useState<ParticipantRow | null>(null);
  const [pending, startTransition] = useTransition();

  const recoverable = participants.filter((p) => p.hasStoredCredentials).length;

  function run(action: () => Promise<void>) {
    startTransition(() => {
      void action();
    });
  }

  async function onReset(row: ParticipantRow) {
    const result = await resetPasswordAction({ profileId: row.profileId });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setCredentials(result.data);
  }

  async function onToggleActive(row: ParticipantRow) {
    const result = await setParticipantActiveAction({
      profileId: row.profileId,
      isActive: !row.isActive,
    });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(row.isActive ? 'Acceso desactivado' : 'Acceso reactivado');
  }

  async function onDelete(row: ParticipantRow) {
    const result = await deleteParticipantAction({ profileId: row.profileId });
    setToDelete(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Se eliminó a ${row.fullName}`);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button onClick={() => setSingleOpen(true)}>
          <UserPlus className="size-4" />
          Agregar participante
        </Button>
        <Button variant="outline" onClick={() => setBulkOpen(true)}>
          <UsersIcon className="size-4" />
          Alta masiva
        </Button>
        <Button variant="outline" asChild disabled={recoverable === 0}>
          <a href="/api/participants/export" download>
            <Download className="size-4" />
            Descargar CSV
          </a>
        </Button>
        <span className="text-muted-foreground ml-auto text-xs">
          {participants.length} {participants.length === 1 ? 'participante' : 'participantes'} ·{' '}
          {recoverable} con credencial sin usar
        </span>
      </div>

      {participants.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <p className="font-medium">Aún no hay participantes</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Agrega el primero para comenzar la capacitación.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Avance</TableHead>
                <TableHead>Última actividad</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.map((row) => (
                <TableRow key={row.profileId}>
                  <TableCell className="font-medium">{row.fullName}</TableCell>
                  <TableCell className="font-mono text-xs">{row.username}</TableCell>
                  <TableCell>
                    {!row.isActive ? (
                      <Badge variant="destructive">Desactivado</Badge>
                    ) : row.mustChangePassword ? (
                      <Badge variant="outline">Credencial sin usar</Badge>
                    ) : (
                      <Badge variant="secondary">Activo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {porcentajeAvance(row.filledModules)} %
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {tiempoRelativo(row.lastActivityAt)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Acciones para ${row.fullName}`}
                        >
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => run(() => onReset(row))}>
                          <KeyRound className="size-4" />
                          Reiniciar contraseña
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => run(() => onToggleActive(row))}>
                          <UserX className="size-4" />
                          {row.isActive ? 'Desactivar acceso' : 'Reactivar acceso'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() => setToDelete(row)}
                          className="text-destructive"
                        >
                          <Trash2 className="size-4" />
                          Eliminar participante
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <SingleForm
        open={singleOpen}
        onOpenChange={setSingleOpen}
        onIssued={(c) => {
          setSingleOpen(false);
          setCredentials(c);
        }}
      />

      <BulkForm
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        onIssued={(c) => {
          setBulkOpen(false);
          setCredentials(c);
        }}
      />

      <Dialog open={Boolean(toDelete)} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar a {toDelete?.fullName}</DialogTitle>
            <DialogDescription>
              Se borrarán también su lienzo, sus post-its y sus análisis. Esta acción no se puede
              deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => toDelete && run(() => onDelete(toDelete))}
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CredentialsDialog credentials={credentials} onClose={() => setCredentials(null)} />
    </div>
  );
}

function SingleForm({
  open,
  onOpenChange,
  onIssued,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIssued: (credentials: IssuedCredentials[]) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateParticipantInput>({
    resolver: zodResolver(createParticipantSchema),
    defaultValues: { fullName: '', email: undefined },
  });

  async function onSubmit(values: CreateParticipantInput) {
    const result = await createParticipantAction(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    reset();
    onIssued(result.data);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar participante</DialogTitle>
          <DialogDescription>
            El usuario y la contraseña temporal se generan automáticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="fullName">Nombre completo</Label>
            <Input id="fullName" aria-invalid={Boolean(errors.fullName)} {...register('fullName')} />
            {errors.fullName && (
              <p className="text-destructive text-sm">{errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Correo (opcional)</Label>
            <Input id="email" type="email" aria-invalid={Boolean(errors.email)} {...register('email')} />
            {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Crear y generar credencial
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BulkForm({
  open,
  onOpenChange,
  onIssued,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIssued: (credentials: IssuedCredentials[]) => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BulkParticipantsInput>({
    resolver: zodResolver(bulkParticipantsSchema),
    defaultValues: { raw: '' },
  });

  // Previsualización con las mismas reglas que aplica el servidor.
  const preview = parseBulkRows(watch('raw') ?? '');

  async function onSubmit(values: BulkParticipantsInput) {
    const result = await createParticipantsBulkAction(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    if (result.data.skipped > 0) {
      toast.warning(`Se omitieron ${result.data.skipped} línea(s) inválidas o repetidas.`);
    }
    reset();
    onIssued(result.data.credentials);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Alta masiva</DialogTitle>
          <DialogDescription>
            Un nombre por línea. También acepta &quot;Nombre, correo&quot; pegado desde una hoja de
            cálculo. Máximo {BULK_MAX_ROWS} por carga.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="raw">Participantes</Label>
            <Textarea
              id="raw"
              rows={10}
              placeholder={'María Fernanda Ruiz\nJorge Luis Castro, jorge@empresa.com\nAna López'}
              aria-invalid={Boolean(errors.raw)}
              {...register('raw')}
            />
            {errors.raw && <p className="text-destructive text-sm">{errors.raw.message}</p>}
            <p className="text-muted-foreground text-xs">
              Se crearán <strong>{preview.rows.length}</strong>{' '}
              {preview.rows.length === 1 ? 'participante' : 'participantes'}
              {preview.skipped > 0 && ` · ${preview.skipped} línea(s) se omitirán`}
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || preview.rows.length === 0}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Crear {preview.rows.length || ''}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
