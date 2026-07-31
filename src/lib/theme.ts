/**
 * Constantes de tema en un módulo NEUTRAL (sin 'use client').
 *
 * Importante: no viven en theme-provider.tsx porque ese archivo es un módulo de
 * cliente, y un Server Component que importe un valor de ahí recibe una
 * referencia de cliente, no el valor. El script anti-parpadeo es servidor y
 * necesita el string real.
 */
export const THEMES = [
  { key: 'principal', label: 'Principal', hint: 'Blanco, azul y turquesa' },
  { key: 'oscuro', label: 'Oscuro', hint: 'Azul oscuro y turquesa' },
  { key: 'creativo', label: 'Creativo', hint: 'Claro, azul, coral y amarillo' },
] as const;

export type ThemeKey = (typeof THEMES)[number]['key'];

export const THEME_STORAGE_KEY = 'canvas-bmc-theme';

export const DEFAULT_THEME: ThemeKey = 'principal';

export function isTheme(value: string | null): value is ThemeKey {
  return value === 'principal' || value === 'oscuro' || value === 'creativo';
}
