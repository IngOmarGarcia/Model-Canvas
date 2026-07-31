import { FileQuestion } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center">
          <span className="bg-muted text-muted-foreground mx-auto mb-3 flex size-12 items-center justify-center rounded-full">
            <FileQuestion className="size-6" />
          </span>
          <h1 className="text-lg font-semibold">No encontramos esta página</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Puede que el enlace haya cambiado o que no tengas acceso a este recurso.
          </p>
          <Button asChild className="mt-4">
            <Link href="/">Volver al inicio</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
