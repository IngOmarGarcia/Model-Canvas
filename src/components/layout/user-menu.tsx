'use client';

import { KeyRound, LogOut, User } from 'lucide-react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function UserMenu({
  fullName,
  username,
  roleLabel,
}: {
  fullName: string;
  username: string;
  roleLabel: string;
}) {
  const [pending, setPending] = useState(false);

  const initials = fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Cuenta de ${fullName}`}>
          <span className="bg-accent text-accent-foreground flex size-8 items-center justify-center rounded-full text-xs font-semibold">
            {initials || <User className="size-4" />}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel>
          <span className="block truncate">{fullName}</span>
          <span className="text-muted-foreground block text-xs font-normal">
            {username} · {roleLabel}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/cambiar-contrasena">
            <KeyRound className="size-4" />
            Cambiar contraseña
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending}
          onSelect={(event) => {
            event.preventDefault();
            setPending(true);
            // signOut del cliente: hace POST a /api/auth/signout, borra la cookie
            // de sesión en el servidor y recién entonces navega a /login.
            void signOut({ redirectTo: '/login' });
          }}
        >
          <LogOut className="size-4" />
          {pending ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
