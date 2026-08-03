'use client';

import {
  AlertTriangle,
  Lightbulb,
  Loader2,
  RefreshCw,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MODULE_BY_KEY, isModuleKey } from '@/lib/bmc/modules';
import { tiempoRelativo } from '@/lib/utils';
import type { AnalysisView } from '@/server/services/analysis.service';

/** Anillo de progreso con la puntuación 0–100. */
function ScoreRing({ score }: { score: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(100, Math.max(0, score)) / 100);

  return (
    <div className="relative size-28 shrink-0">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--muted)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold tabular-nums">{score}</span>
        <span className="text-muted-foreground text-[10px]">de 100</span>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: { titulo: string; detalle: string; extra?: string }[];
}) {
  if (items.length === 0) return null;

  return (
    <section>
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
        {icon}
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.titulo} className="border-border rounded-lg border p-3">
            <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
              {item.titulo}
              {item.extra && <Badge variant="outline">{item.extra}</Badge>}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">{item.detalle}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AnalysisPanel({
  initial,
  scope,
  canvasId,
  canForce = false,
  emptyHint,
  unavailable,
}: {
  initial: AnalysisView | null;
  scope: 'canvas' | 'session';
  canvasId?: string;
  /** Solo el facilitador puede ignorar la caché. */
  canForce?: boolean;
  emptyHint?: string;
  /**
   * Motivo por el que no se pueden pedir análisis nuevos. El panel no se oculta:
   * explica la situación y sigue mostrando el último análisis guardado, que
   * conserva todo su valor aunque el proveedor esté caído.
   */
  unavailable?: string;
}) {
  const [analysis, setAnalysis] = useState(initial);
  const [loading, setLoading] = useState(false);

  async function request(force = false) {
    if (unavailable) return;

    setLoading(true);
    try {
      const response = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scope, canvasId, force }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error ?? 'No se pudo generar el análisis.');
        return;
      }

      setAnalysis(data);
      toast.success(data.cached ? 'Tu análisis sigue vigente' : 'Análisis generado');
    } catch {
      toast.error('No se pudo contactar al servidor.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {unavailable && (
        <Alert variant="accent">
          <AlertTitle>El análisis por IA no está disponible ahora mismo</AlertTitle>
          <AlertDescription>{unavailable}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => request(false)} disabled={loading || Boolean(unavailable)}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {analysis ? 'Actualizar análisis' : 'Solicitar análisis'}
        </Button>

        {canForce && analysis && (
          <Button
            variant="outline"
            onClick={() => request(true)}
            disabled={loading || Boolean(unavailable)}
          >
            <RefreshCw className="size-4" />
            Forzar uno nuevo
          </Button>
        )}

        {analysis && (
          <span className="text-muted-foreground text-xs">
            {tiempoRelativo(analysis.createdAt)} · {analysis.model}
            {analysis.cached && ' · sin cambios desde el último análisis'}
            {unavailable && ' · último análisis guardado'}
          </span>
        )}
      </div>

      {analysis?.truncated && (
        <Alert variant="accent">
          <AlertDescription>
            El lienzo es muy extenso: se analizaron las notas más recientes de cada módulo.
          </AlertDescription>
        </Alert>
      )}

      {!analysis ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <p className="font-medium">Todavía no hay análisis</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {unavailable
                ? 'En cuanto el análisis vuelva a estar disponible podrás solicitarlo desde aquí. Mientras tanto, sigue trabajando en tu lienzo con normalidad.'
                : (emptyHint ?? 'Solicita uno para recibir retroalimentación sobre tu avance.')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-5 p-6">
            <div className="flex flex-wrap items-center gap-4">
              <ScoreRing score={analysis.score ?? analysis.result.puntuacion} />
              <p className="min-w-56 flex-1 text-sm">{analysis.result.resumen}</p>
            </div>

            <Section
              title="Fortalezas"
              icon={<ThumbsUp className="size-4" />}
              items={analysis.result.fortalezas.map((f) => ({
                titulo: f.titulo,
                detalle: f.detalle,
                extra: f.modulo && isModuleKey(f.modulo) ? MODULE_BY_KEY[f.modulo].name : undefined,
              }))}
            />

            <Section
              title="Debilidades"
              icon={<ThumbsDown className="size-4" />}
              items={analysis.result.debilidades.map((d) => ({
                titulo: d.titulo,
                detalle: d.detalle,
                extra: d.modulo && isModuleKey(d.modulo) ? MODULE_BY_KEY[d.modulo].name : undefined,
              }))}
            />

            <Section
              title="Riesgos"
              icon={<AlertTriangle className="size-4" />}
              items={analysis.result.riesgos.map((r) => ({
                titulo: r.titulo,
                detalle: r.detalle,
                extra: `severidad ${r.severidad}`,
              }))}
            />

            <Section
              title="Recomendaciones"
              icon={<Lightbulb className="size-4" />}
              items={[...analysis.result.recomendaciones]
                .sort((a, b) => a.prioridad - b.prioridad)
                .map((r) => ({
                  titulo: r.titulo,
                  detalle: r.detalle,
                  extra: `prioridad ${r.prioridad}`,
                }))}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
