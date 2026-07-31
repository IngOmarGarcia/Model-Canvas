'use client';

import { ChevronLeft, ChevronRight, LayoutGrid, List } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { MODULES_IN_ORDER, TOTAL_MODULES, type BmcModule } from '@/lib/bmc/modules';
import { cn } from '@/lib/utils';

/**
 * Vista educativa de los nueve módulos.
 * El paso vive en la URL (?modulo=3) para poder proyectarlo o compartirlo.
 */
export function MethodologyView({ basePath }: { basePath: string }) {
  const router = useRouter();
  const params = useSearchParams();

  const vista = params.get('vista') === 'indice' ? 'indice' : 'recorrido';
  const paso = clampStep(Number(params.get('modulo') ?? 1));
  const current = MODULES_IN_ORDER[paso - 1];

  const navigate = useCallback(
    (next: { modulo?: number; vista?: string }) => {
      const search = new URLSearchParams(params.toString());
      if (next.modulo !== undefined) search.set('modulo', String(next.modulo));
      if (next.vista !== undefined) search.set('vista', next.vista);
      router.replace(`${basePath}?${search.toString()}`, { scroll: false });
    },
    [basePath, params, router],
  );

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Button
          variant={vista === 'recorrido' ? 'default' : 'outline'}
          size="sm"
          onClick={() => navigate({ vista: 'recorrido' })}
        >
          <List className="size-4" />
          Recorrido
        </Button>
        <Button
          variant={vista === 'indice' ? 'default' : 'outline'}
          size="sm"
          onClick={() => navigate({ vista: 'indice' })}
        >
          <LayoutGrid className="size-4" />
          Índice
        </Button>
      </div>

      {vista === 'indice' ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {MODULES_IN_ORDER.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => navigate({ modulo: m.order, vista: 'recorrido' })}
              className="text-left"
            >
              <ModuleSummaryCard module={m} />
            </button>
          ))}
        </div>
      ) : (
        <ModuleDetail
          module={current}
          step={paso}
          onPrevious={() => navigate({ modulo: paso - 1 })}
          onNext={() => navigate({ modulo: paso + 1 })}
        />
      )}
    </div>
  );
}

function clampStep(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(TOTAL_MODULES, Math.max(1, Math.trunc(value)));
}

function ModuleSummaryCard({ module: m }: { module: BmcModule }) {
  return (
    <Card className="hover:border-primary h-full transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{m.order}</Badge>
          <Icon name={m.icon} className="text-muted-foreground size-4" />
          <span className="truncate font-medium">{m.name}</span>
        </div>
        <p className="text-muted-foreground mt-2 line-clamp-3 text-sm">{m.description}</p>
      </CardContent>
    </Card>
  );
}

function ModuleDetail({
  module: m,
  step,
  onPrevious,
  onNext,
}: {
  module: BmcModule;
  step: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-lg text-lg font-semibold">
            {m.order}
          </span>
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <Icon name={m.icon} className="text-muted-foreground size-5" />
              <span className="truncate">{m.name}</span>
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-xs uppercase">{m.area}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <p className="text-base">{m.description}</p>

        <section>
          <h3 className="mb-2 text-sm font-semibold">Preguntas orientadoras</h3>
          <ul className="space-y-1.5">
            {m.questions.map((q) => (
              <li key={q} className="flex gap-2 text-sm">
                <span className="text-accent" aria-hidden="true">
                  •
                </span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-muted rounded-lg p-3">
          <h3 className="mb-1 text-sm font-semibold">Ejemplo</h3>
          <p className="text-sm">{m.example}</p>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold">Conceptos clave</h3>
          <div className="flex flex-wrap gap-1.5">
            {m.concepts.map((c) => (
              <Badge key={c} variant="outline">
                {c}
              </Badge>
            ))}
          </div>
        </section>

        <div className="border-border flex items-center justify-between border-t pt-4">
          <Button variant="outline" size="sm" onClick={onPrevious} disabled={step === 1}>
            <ChevronLeft className="size-4" />
            Anterior
          </Button>

          <span className={cn('text-muted-foreground text-sm tabular-nums')}>
            {step} de {TOTAL_MODULES}
          </span>

          <Button variant="outline" size="sm" onClick={onNext} disabled={step === TOTAL_MODULES}>
            Siguiente
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
