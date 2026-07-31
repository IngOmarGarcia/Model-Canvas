'use client';

import { HelpCircle } from 'lucide-react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { BmcModule } from '@/lib/bmc/modules';

/** Explicación breve y preguntas orientadoras del módulo (docs/02). */
export function ModuleHelp({ module: m }: { module: BmcModule }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground rounded p-0.5"
          aria-label={`Ayuda sobre ${m.name}`}
        >
          <HelpCircle className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <p className="text-sm font-semibold">
          {m.order}. {m.name}
        </p>
        <p className="text-muted-foreground mt-1 text-sm">{m.description}</p>

        <p className="mt-3 text-xs font-semibold uppercase">Preguntas orientadoras</p>
        <ul className="mt-1 space-y-1">
          {m.questions.map((q) => (
            <li key={q} className="flex gap-1.5 text-sm">
              <span className="text-accent" aria-hidden="true">
                •
              </span>
              <span>{q}</span>
            </li>
          ))}
        </ul>

        <p className="bg-muted mt-3 rounded p-2 text-xs">
          <span className="font-semibold">Ejemplo: </span>
          {m.example}
        </p>
      </PopoverContent>
    </Popover>
  );
}
