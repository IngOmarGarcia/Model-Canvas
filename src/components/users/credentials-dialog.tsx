'use client';

import { Check, Copy, Download, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { IssuedCredentials } from '@/server/services/participants.service';

/**
 * Muestra las credenciales recién generadas.
 * Advierte de forma explícita que la contraseña deja de ser recuperable en
 * cuanto el participante la use por primera vez (docs/09).
 */
export function CredentialsDialog({
  credentials,
  onClose,
}: {
  credentials: IssuedCredentials[] | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error('El navegador bloqueó el portapapeles. Copia el texto a mano.');
    }
  }

  const allText = (credentials ?? [])
    .map((c) => `${c.fullName}\t${c.username}\t${c.password}`)
    .join('\n');

  return (
    <Dialog open={Boolean(credentials)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {credentials?.length === 1 ? 'Credencial generada' : 'Credenciales generadas'}
          </DialogTitle>
          <DialogDescription>
            Entrégalas a los participantes. Al primer inicio de sesión se les pedirá definir su
            propia contraseña.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="accent">
          <AlertDescription className="flex gap-2">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              Cópialas ahora. Una vez que el participante inicie sesión, la contraseña temporal se
              borra y ya no se puede volver a mostrar.
            </span>
          </AlertDescription>
        </Alert>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Contraseña</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {credentials?.map((c) => (
              <TableRow key={c.username}>
                <TableCell className="whitespace-nowrap">{c.fullName}</TableCell>
                <TableCell className="font-mono text-xs">{c.username}</TableCell>
                <TableCell className="font-mono text-xs">{c.password}</TableCell>
                <TableCell>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Copiar credencial de ${c.fullName}`}
                    onClick={() => copy(`${c.username}  ${c.password}`, c.username)}
                  >
                    {copied === c.username ? (
                      <Check className="size-4" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <DialogFooter>
          <Button variant="outline" onClick={() => copy(allText, '__all__')}>
            {copied === '__all__' ? <Check className="size-4" /> : <Copy className="size-4" />}
            Copiar todo
          </Button>
          <Button variant="outline" asChild>
            <a href="/api/participants/export" download>
              <Download className="size-4" />
              Descargar CSV
            </a>
          </Button>
          <Button onClick={onClose}>Listo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
