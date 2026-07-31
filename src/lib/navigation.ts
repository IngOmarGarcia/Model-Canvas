import type { UserRole } from '@/db/schema/enums';

export interface NavItem {
  href: string;
  label: string;
  /** Nombre del icono de lucide-react. */
  icon: string;
  description?: string;
}

export const FACILITATOR_NAV: readonly NavItem[] = [
  { href: '/f', label: 'Resumen', icon: 'LayoutDashboard', description: 'Estado de la capacitación' },
  { href: '/f/monitoreo', label: 'Monitoreo', icon: 'Activity', description: 'Avance en tiempo real' },
  { href: '/f/lienzo', label: 'Mi lienzo', icon: 'Grid3x3', description: 'Lienzo del facilitador' },
  { href: '/f/analisis', label: 'Análisis', icon: 'Sparkles', description: 'Análisis general por IA' },
  { href: '/f/metodologia', label: 'Metodología', icon: 'BookOpen', description: 'Los nueve módulos' },
  { href: '/f/usuarios', label: 'Usuarios', icon: 'Users', description: 'Participantes y credenciales' },
  { href: '/f/configuracion', label: 'Configuración', icon: 'Settings', description: 'Organización e IA' },
] as const;

export const PARTICIPANT_NAV: readonly NavItem[] = [
  { href: '/p/lienzo', label: 'Mi lienzo', icon: 'Grid3x3', description: 'Tu Business Model Canvas' },
  { href: '/p/metodologia', label: 'Metodología', icon: 'BookOpen', description: 'Guía de los módulos' },
  { href: '/p/analisis', label: 'Análisis', icon: 'Sparkles', description: 'Tu último análisis' },
] as const;

export function navForRole(role: UserRole): readonly NavItem[] {
  return role === 'facilitator' ? FACILITATOR_NAV : PARTICIPANT_NAV;
}

export function homeForRole(role: UserRole): string {
  return role === 'facilitator' ? '/f' : '/p/lienzo';
}

/** Marca activo el ítem exacto o su subruta, sin que "/f" active todo. */
export function isActive(pathname: string, href: string): boolean {
  if (href === '/f') return pathname === '/f';
  return pathname === href || pathname.startsWith(`${href}/`);
}
