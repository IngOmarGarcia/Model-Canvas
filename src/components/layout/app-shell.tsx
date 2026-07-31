'use client';

import { Menu } from 'lucide-react';
import { useState } from 'react';

import { ThemeSwitcher } from '@/components/theme/theme-switcher';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import type { NavItem } from '@/lib/navigation';

import { SidebarNav } from './sidebar-nav';
import { UserMenu } from './user-menu';

export function AppShell({
  items,
  organizationName,
  trainingName,
  fullName,
  username,
  roleLabel,
  children,
}: {
  items: readonly NavItem[];
  organizationName: string;
  trainingName: string | null;
  fullName: string;
  username: string;
  roleLabel: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const brand = (
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold">{organizationName}</p>
      <p className="text-muted-foreground truncate text-xs">
        {trainingName ?? 'Sin capacitación activa'}
      </p>
    </div>
  );

  return (
    <div className="bg-background flex min-h-dvh flex-col lg:flex-row">
      {/* Barra lateral fija en desktop */}
      <aside className="border-border bg-surface hidden w-64 shrink-0 flex-col border-r p-4 lg:flex">
        <div className="mb-6 px-1">{brand}</div>
        <SidebarNav items={items} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border bg-surface/80 sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-3 backdrop-blur lg:px-6">
          {/* En móvil la barra lateral pasa a panel deslizante */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Abrir menú">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetTitle className="mb-4">{organizationName}</SheetTitle>
              <SidebarNav items={items} onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1 lg:hidden">{brand}</div>

          <div className="ml-auto flex items-center gap-1">
            <ThemeSwitcher />
            <UserMenu fullName={fullName} username={username} roleLabel={roleLabel} />
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
