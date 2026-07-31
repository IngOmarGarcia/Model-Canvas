'use client';

import { Check } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { NOTE_COLORS } from '@/lib/colors';
import { THEMES } from '@/lib/theme';
import { cn } from '@/lib/utils';

import { useTheme } from './theme-provider';

/** Selector de tema con muestra de la paleta de post-its aplicada al tema activo. */
export function ThemePreview() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {THEMES.map((t) => {
        const selected = theme === t.key;
        return (
          <Card
            key={t.key}
            className={cn(
              'cursor-pointer transition-colors',
              selected ? 'border-primary ring-primary/30 ring-2' : 'hover:border-primary/50',
            )}
          >
            <CardContent className="p-4">
              <button
                type="button"
                onClick={() => setTheme(t.key)}
                aria-pressed={selected}
                className="w-full text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{t.label}</span>
                  {selected && <Check className="text-primary size-4" />}
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">{t.hint}</p>

                {/* data-theme local: cada tarjeta muestra la paleta de SU tema,
                    no la del tema activo del documento. */}
                <div data-theme={t.key} className="mt-3 flex gap-1">
                  {NOTE_COLORS.map((c) => (
                    <span
                      key={c.key}
                      title={`${c.label} · ${c.uso}`}
                      className="border-border/50 size-6 rounded border"
                      style={{ background: `var(--note-${c.key})` }}
                    />
                  ))}
                </div>
              </button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
