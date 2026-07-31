import type { Metadata } from 'next';
import { Suspense } from 'react';

import { PageHeader } from '@/components/layout/page-header';
import { MethodologyView } from '@/components/methodology/methodology-view';
import { Skeleton } from '@/components/ui/skeleton';
import { requireRole } from '@/server/session';

export const metadata: Metadata = { title: 'Metodología' };

export default async function ParticipantMethodologyPage() {
  await requireRole('participant');

  return (
    <>
      <PageHeader
        title="Metodología"
        description="Consulta qué va en cada módulo antes de escribir tus notas."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <MethodologyView basePath="/p/metodologia" />
      </Suspense>
    </>
  );
}
