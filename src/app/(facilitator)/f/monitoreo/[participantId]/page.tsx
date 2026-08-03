import { Eye, Presentation } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AnalysisPanel } from '@/components/analysis/analysis-panel';
import { CanvasBoard } from '@/components/canvas/canvas-board';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { porcentajeAvance, tiempoRelativo } from '@/lib/utils';
import { getLatestAnalysis } from '@/server/services/analysis.service';
import { getCanvasById } from '@/server/services/canvas.service';
import { getWorkspaceContext } from '@/server/services/context.service';
import {
  describeUnavailability,
  getLlmSettings,
  isConfigured,
} from '@/server/services/llm-settings.service';
import { listParticipants } from '@/server/services/participants.service';
import { requireRole } from '@/server/session';

export const metadata: Metadata = { title: 'Lienzo del participante' };

/**
 * Lienzo de un participante en MODO LECTURA.
 * El facilitador nunca escribe en lienzos ajenos (docs/03, regla 3): la UI va
 * en solo lectura y el servicio de notas rechazaría la escritura de todos modos.
 */
export default async function ParticipantCanvasReadOnlyPage({
  params,
}: {
  params: Promise<{ participantId: string }>;
}) {
  const { participantId } = await params;

  const user = await requireRole('facilitator');
  const context = await getWorkspaceContext(user);
  if (!context.trainingSessionId) notFound();

  // Se busca dentro de los participantes de SU capacitación: un id ajeno da 404
  // y no confirma que el recurso exista.
  const participants = await listParticipants(user, context.trainingSessionId);
  const participant = participants.find((row) => row.profileId === participantId);

  if (!participant?.canvasId) notFound();

  const canvas = await getCanvasById(participant.canvasId);
  if (!canvas) notFound();

  const [settings, latestAnalysis] = await Promise.all([
    getLlmSettings(user),
    getLatestAnalysis(user, 'canvas', canvas.id),
  ]);

  return (
    <>
      <PageHeader
        title={participant.fullName}
        description={`${participant.username} · última actividad ${tiempoRelativo(participant.lastActivityAt)}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              <Eye className="size-3" />
              Solo lectura
            </Badge>
            <Badge variant="secondary">
              {porcentajeAvance(canvas.filledModules)} % · {canvas.noteCount}{' '}
              {canvas.noteCount === 1 ? 'nota' : 'notas'}
            </Badge>
            <Button asChild variant="outline" size="sm">
              <Link href={`/presentacion/${canvas.id}`}>
                <Presentation className="size-4" />
                Proyectar
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/f/monitoreo">Volver</Link>
            </Button>
          </div>
        }
      />

      <CanvasBoard canvasId={canvas.id} initialNotes={canvas.notes} editable={false} />

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">Análisis de este lienzo</h2>
        <AnalysisPanel
          initial={latestAnalysis}
          scope="canvas"
          canvasId={canvas.id}
          canForce
          unavailable={isConfigured(settings) ? undefined : describeUnavailability(settings)}
          emptyHint="Solicita un análisis para revisar el avance de este participante."
        />
      </section>
    </>
  );
}
