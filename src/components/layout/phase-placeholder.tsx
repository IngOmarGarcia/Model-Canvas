import { Construction } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

/**
 * Marca una pantalla creada en la Fase 2 cuyo contenido llega en una fase
 * posterior. Enumera lo que se construirá, para que la navegación ya sea real
 * y el alcance quede visible.
 */
export function PhasePlaceholder({
  phase,
  items,
}: {
  phase: 3 | 4 | 5 | 6;
  items: string[];
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start">
        <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
          <Construction className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="font-medium">Se construye en la Fase {phase}</p>
          <ul className="text-muted-foreground mt-2 list-inside list-disc space-y-1 text-sm">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
