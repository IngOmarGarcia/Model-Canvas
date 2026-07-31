import {
  Activity,
  Banknote,
  BookOpen,
  Boxes,
  Gem,
  Grid3x3,
  Handshake,
  HeartHandshake,
  LayoutDashboard,
  ListChecks,
  type LucideIcon,
  Receipt,
  Send,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react';

/**
 * Registro explícito de iconos: los módulos y la navegación guardan el nombre
 * como texto (lib/bmc/modules.ts, lib/navigation.ts) y aquí se resuelve al
 * componente, sin importaciones dinámicas ni bundle completo de lucide.
 */
const REGISTRY = {
  Activity,
  Banknote,
  BookOpen,
  Boxes,
  Gem,
  Grid3x3,
  Handshake,
  HeartHandshake,
  LayoutDashboard,
  ListChecks,
  Receipt,
  Send,
  Settings,
  Sparkles,
  Users,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof REGISTRY;

export function Icon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Component = REGISTRY[name as IconName] ?? Sparkles;
  return <Component className={className} aria-hidden="true" />;
}
