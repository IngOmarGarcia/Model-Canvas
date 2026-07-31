# 06 — Sistema de diseño y temas

## Mecanismo

Un único juego de tokens en `src/app/globals.css`, expresados como variables CSS en `:root` y
sobrescritos por `[data-theme="oscuro"]` y `[data-theme="creativo"]`. El atributo se aplica en
`<html>` desde un `ThemeProvider` propio que persiste la elección en `localStorage` y la escribe
antes del primer pintado (script inline en `<head>`) para evitar parpadeo. El tema por defecto de la
organización viene de `organizations.theme` y sirve como valor inicial para quien no ha elegido.

Los componentes de shadcn/ui consumen los mismos nombres de token (`--background`, `--foreground`,
`--primary`, …), de modo que cambiar de tema no requiere tocar componentes.

## Tokens

| Token | Uso |
| ----- | --- |
| `--background`, `--foreground` | Fondo y texto de la aplicación |
| `--surface`, `--surface-foreground` | Tarjetas, paneles, barra lateral |
| `--muted`, `--muted-foreground` | Texto secundario, fondos sutiles |
| `--primary`, `--primary-foreground` | Azul de marca: acciones principales |
| `--accent`, `--accent-foreground` | Turquesa/coral: énfasis, indicador en vivo |
| `--border`, `--input`, `--ring` | Bordes, campos y foco |
| `--destructive` | Eliminar, desactivar |
| `--canvas-bg`, `--canvas-grid` | Fondo del lienzo y rejilla |
| `--module-border`, `--module-header` | Bloques del BMC |
| `--note-*` y `--note-*-fg` | Los seis colores de post-it |
| `--radius` | Radio base (0.625rem) |

## 1. Tema principal (`principal`) — blanco, azul, turquesa

Limpio y profesional, es el predeterminado.

```css
:root {
  --background: oklch(0.99 0.004 240);   /* blanco frío */
  --foreground: oklch(0.22 0.03 250);
  --surface: oklch(1 0 0);
  --muted: oklch(0.96 0.01 235);
  --muted-foreground: oklch(0.5 0.02 250);
  --primary: oklch(0.55 0.16 250);       /* azul */
  --primary-foreground: oklch(0.99 0 0);
  --accent: oklch(0.72 0.12 195);        /* turquesa */
  --accent-foreground: oklch(0.2 0.04 220);
  --border: oklch(0.9 0.01 240);
  --ring: oklch(0.55 0.16 250);
  --destructive: oklch(0.58 0.2 25);
  --canvas-bg: oklch(0.985 0.005 230);
  --canvas-grid: oklch(0.93 0.01 235);
  --module-border: oklch(0.88 0.02 235);
  --radius: 0.625rem;
}
```

## 2. Tema oscuro (`oscuro`) — azul oscuro, turquesa, superficies oscuras

```css
[data-theme="oscuro"] {
  --background: oklch(0.21 0.04 255);    /* azul muy oscuro */
  --foreground: oklch(0.95 0.01 230);
  --surface: oklch(0.26 0.04 255);
  --muted: oklch(0.3 0.03 255);
  --muted-foreground: oklch(0.72 0.02 230);
  --primary: oklch(0.68 0.13 245);
  --primary-foreground: oklch(0.16 0.03 255);
  --accent: oklch(0.78 0.13 190);        /* turquesa luminoso */
  --border: oklch(0.35 0.03 255);
  --canvas-bg: oklch(0.24 0.04 255);
  --canvas-grid: oklch(0.31 0.03 255);
}
```

## 3. Tema creativo (`creativo`) — fondo claro, azul, coral, amarillo suave

```css
[data-theme="creativo"] {
  --background: oklch(0.98 0.015 90);    /* crema */
  --foreground: oklch(0.25 0.04 265);
  --surface: oklch(1 0.005 90);
  --primary: oklch(0.56 0.17 262);       /* azul */
  --accent: oklch(0.7 0.17 30);          /* coral */
  --accent-foreground: oklch(0.99 0 0);
  --muted: oklch(0.95 0.05 95);          /* amarillo suave */
  --border: oklch(0.89 0.04 80);
  --canvas-bg: oklch(0.97 0.02 88);
  --canvas-grid: oklch(0.92 0.04 85);
}
```

> Los valores son la línea base de la Fase 2; se ajustarán tras verificar contraste real.

## Colores de post-it

Seis colores fijos, con token de fondo y de texto por tema para mantener legibilidad (en tema
oscuro se usan versiones desaturadas y texto oscuro sobre la nota, como una nota física iluminada).

| Clave | Nombre en UI | Uso sugerido |
| ----- | ------------ | ------------ |
| `yellow` | Amarillo | Ideas generales (color por defecto) |
| `blue` | Azul | Datos y hechos |
| `teal` | Turquesa | Oportunidades |
| `pink` | Rosa | Dudas y supuestos por validar |
| `green` | Verde | Confirmado o validado |
| `orange` | Naranja | Riesgos y pendientes |

Los nombres de uso son sugerencia visible en el selector; no restringen nada. Definidos una sola vez
en `src/lib/colors.ts` y expuestos como `--note-yellow` … `--note-orange`.

## Reglas de diseño

- **Contraste:** texto normal ≥ 4.5:1 y elementos de interfaz ≥ 3:1 en los tres temas. El texto de
  los post-its se valida contra su propio fondo, no contra el del lienzo.
- **Foco visible siempre:** anillo de 2 px con `--ring`; nunca `outline: none` sin sustituto.
- **Movimiento:** transiciones ≤ 150 ms; se desactivan bajo `prefers-reduced-motion`.
- **Tipografía:** una familia sans (Geist o Inter). Escala: 12 / 14 / 16 / 20 / 24 / 32. En modo
  presentación, la escala sube un paso completo.
- **Densidad:** altura mínima táctil de 44 px en controles del lienzo; los post-its tienen un mínimo
  de 120 × 96 px para seguir siendo legibles en proyector.
- **Sombra e inclinación:** los post-its usan una sombra suave y una rotación aleatoria estable
  (derivada del id, ±1.5°) para el aspecto físico; se elimina en modo presentación por nitidez.

## Puntos de quiebre

| Ancho | Comportamiento |
| ----- | -------------- |
| ≥ 1280 px (desktop, prioritario) | Lienzo completo 5×3, barra lateral fija, cuadrícula de monitoreo a 4 columnas |
| 768–1279 px (tablet) | Lienzo en 2 columnas por área, barra lateral colapsable, monitoreo a 2 columnas |
| < 768 px (móvil) | Lienzo en 1 columna con navegación por módulo (1 de 9), barra inferior, monitoreo en lista |
