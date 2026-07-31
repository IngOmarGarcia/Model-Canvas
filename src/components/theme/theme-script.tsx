import { DEFAULT_THEME, THEME_STORAGE_KEY, type ThemeKey } from '@/lib/theme';

/**
 * Aplica el tema antes del primer pintado para evitar parpadeo.
 * Es un <script> síncrono en <head>: no hay hidratación ni estado de por medio.
 *
 * Las constantes vienen de lib/theme.ts (módulo neutral) y no del provider:
 * importar un valor de un módulo 'use client' desde el servidor devuelve una
 * referencia de cliente, y el script quedaría con una clave inservible.
 */
export function ThemeScript({ defaultTheme = DEFAULT_THEME }: { defaultTheme?: ThemeKey }) {
  const code = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
var v=(t==='principal'||t==='oscuro'||t==='creativo')?t:${JSON.stringify(defaultTheme)};
document.documentElement.dataset.theme=v;}catch(e){
document.documentElement.dataset.theme=${JSON.stringify(defaultTheme)};}})();`;

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
