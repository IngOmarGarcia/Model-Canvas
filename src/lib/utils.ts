import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "hace 3 min", "hace 2 h", "ayer" — para actividad reciente y última modificación. */
export function tiempoRelativo(fecha: Date | string | null | undefined): string {
  if (!fecha) return 'sin actividad';

  const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
  const segundos = Math.floor((Date.now() - date.getTime()) / 1000);

  if (segundos < 10) return 'ahora mismo';
  if (segundos < 60) return `hace ${segundos} s`;

  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `hace ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;

  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ayer';
  if (dias < 30) return `hace ${dias} días`;

  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Avance del lienzo: módulos con al menos una nota, sobre nueve. */
export function porcentajeAvance(modulosConNotas: number): number {
  return Math.round((Math.min(modulosConNotas, 9) / 9) * 100);
}
