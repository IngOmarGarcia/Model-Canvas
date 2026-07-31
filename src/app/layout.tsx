import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';

import { ThemeProvider } from '@/components/theme/theme-provider';
import { ThemeScript } from '@/components/theme/theme-script';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Canvas BMC',
    template: '%s · Canvas BMC',
  },
  description: 'Capacitación en Business Model Canvas con lienzos colaborativos y análisis por IA.',
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: el script inline escribe data-theme antes de hidratar.
    <html lang="es" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <Toaster position="bottom-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
