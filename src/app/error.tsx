'use client';

import { RotateCcw, TriangleAlert } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Frontera de error de la aplicación. Muestra un mensaje propio; el detalle
 * queda en el log del servidor con su digest (docs/09).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[error-boundary]', error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center">
          <span className="bg-muted text-muted-foreground mx-auto mb-3 flex size-12 items-center justify-center rounded-full">
            <TriangleAlert className="size-6" />
          </span>
          <h1 className="text-lg font-semibold">Algo salió mal</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            No pudimos cargar esta pantalla. Vuelve a intentarlo; si persiste, avisa al facilitador.
          </p>
          {error.digest && (
            <p className="text-muted-foreground mt-2 font-mono text-xs">
              referencia: {error.digest}
            </p>
          )}
          <Button className="mt-4" onClick={reset}>
            <RotateCcw className="size-4" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
