import type { Metadata } from 'next';
import { Suspense } from 'react';

import { PageHeader } from '@/components/layout/page-header';
import { MethodologyView } from '@/components/methodology/methodology-view';
import { Skeleton } from '@/components/ui/skeleton';
import { requireRole } from '@/server/session';

export const metadata: Metadata = { title: 'Metodología' };

export default async function FacilitatorMethodologyPage() {
  await requireRole('facilitator');

  return (
    <>
      <PageHeader
        title="Metodología"
        description="Los nueve módulos en su orden de trabajo, con preguntas orientadoras y ejemplos."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <MethodologyView basePath="/f/metodologia" />
      </Suspense>
    </>
  );
}
