'use client';

import { Grid2x2, List, Radio, RefreshCw, Search, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { porcentajeAvance, tiempoRelativo } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { LiveEvent } from '@/server/services/events.service';
import type { ParticipantRow } from '@/server/services/participants.service';

import { CanvasThumbnail } from './canvas-thumbnail';
import { useLiveEvents, type LiveStatus } from './use-live-events';

type Filter = 'todos' | 'trabajando' | 'sin-iniciar' | 'terminado';

/** "En vivo" = evento propio en los últimos 60 s (docs/07). */
const LIVE_WINDOW_MS = 60_000;

export function MonitoringView({
  trainingSessionId,
  initialParticipants,
  initialCursor,
}: {
  trainingSessionId: string;
  initialParticipants: ParticipantRow[];
  initialCursor: number;
}) {
  const [participants, setParticipants] = useState(initialParticipants);
  const [liveCanvases, setLiveCanvases] = useState<Record<string, number>>({});
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');
  const [view, setView] = useState<'cuadricula' | 'lista'>('cuadricula');

  /**
   * Los eventos traen ids y contadores, así que la tarjeta se actualiza sin
   * volver a pedir el lienzo. Se aplican como parche sobre el estado inicial.
   */
  const applyEvents = useCallback((events: LiveEvent[]) => {
    const touched: Record<string, number> = {};

    setParticipants((current) => {
      let next = current;

      for (const event of events) {
        if (!event.canvasId) continue;
        touched[event.canvasId] = Date.now();

        const payload = event.payload as {
          noteCount?: number;
          filledModules?: number;
          status?: ParticipantRow['canvasStatus'];
          moduleKey?: string;
        };

        next = next.map((row) => {
          if (row.canvasId !== event.canvasId) return row;

          const moduleCounts =
            payload.moduleKey !== undefined
              ? { ...row.moduleCounts }
              : row.moduleCounts;

          if (payload.moduleKey !== undefined && payload.noteCount !== undefined) {
            // El conteo exacto del módulo llega en la siguiente lectura completa;
            // aquí basta marcarlo como no vacío para la miniatura.
            moduleCounts[payload.moduleKey] = Math.max(1, moduleCounts[payload.moduleKey] ?? 0);
          }

          return {
            ...row,
            noteCount: payload.noteCount ?? row.noteCount,
            filledModules: payload.filledModules ?? row.filledModules,
            canvasStatus: payload.status ?? row.canvasStatus,
            lastActivityAt: new Date(event.at),
            moduleCounts,
          };
        });
      }

      return next;
    });

    if (Object.keys(touched).length > 0) {
      setLiveCanvases((current) => ({ ...current, ...touched }));
    }
  }, []);

  const { status } = useLiveEvents(trainingSessionId, initialCursor, applyEvents);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return participants.filter((row) => {
      if (needle && !`${row.fullName} ${row.username}`.toLowerCase().includes(needle)) {
        return false;
      }
      if (filter === 'trabajando') return row.canvasStatus === 'in_progress';
      if (filter === 'sin-iniciar') return row.canvasStatus === 'not_started';
      if (filter === 'terminado') return row.canvasStatus === 'completed';
      return true;
    });
  }, [filter, participants, query]);

  if (participants.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <p className="font-medium">Aún no hay participantes</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Agrega el primero para comenzar a monitorear la capacitación.
          </p>
          <Button asChild className="mt-4">
            <Link href="/f/usuarios">Agregar participantes</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre o usuario"
            className="pl-9"
            aria-label="Buscar participante"
          />
        </div>

        <div className="flex gap-1">
          {(
            [
              ['todos', 'Todos'],
              ['trabajando', 'Trabajando'],
              ['sin-iniciar', 'Sin iniciar'],
              ['terminado', 'Terminados'],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={filter === key ? 'default' : 'outline'}
              onClick={() => setFilter(key)}
            >
              {label}
            </Button>
          ))}
        </div>

        <Button
          size="icon-sm"
          variant="outline"
          aria-label={view === 'cuadricula' ? 'Ver como lista' : 'Ver como cuadrícula'}
          onClick={() => setView(view === 'cuadricula' ? 'lista' : 'cuadricula')}
        >
          {view === 'cuadricula' ? <List className="size-4" /> : <Grid2x2 className="size-4" />}
        </Button>

        <ConnectionChip status={status} />
      </div>

      {visible.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          Ningún participante coincide con la búsqueda.
        </p>
      ) : view === 'cuadricula' ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {visible.map((row) => (
            <ParticipantCard
              key={row.profileId}
              row={row}
              live={isLive(liveCanvases, row.canvasId)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((row) => (
            <ParticipantListItem
              key={row.profileId}
              row={row}
              live={isLive(liveCanvases, row.canvasId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function isLive(liveCanvases: Record<string, number>, canvasId: string | null): boolean {
  if (!canvasId) return false;
  const at = liveCanvases[canvasId];
  return Boolean(at && Date.now() - at < LIVE_WINDOW_MS);
}

function ConnectionChip({ status }: { status: LiveStatus }) {
  const map: Record<LiveStatus, { label: string; icon: React.ReactNode; variant: 'secondary' | 'accent' | 'destructive' }> = {
    live: { label: 'En vivo', icon: <Radio className="size-3" />, variant: 'accent' },
    polling: { label: 'Actualizando', icon: <RefreshCw className="size-3" />, variant: 'secondary' },
    reconnecting: { label: 'Reconectando…', icon: <Wifi className="size-3" />, variant: 'secondary' },
    offline: { label: 'Sin conexión', icon: <WifiOff className="size-3" />, variant: 'destructive' },
  };

  const item = map[status];
  return (
    <Badge variant={item.variant} title="Estado del canal de tiempo real">
      {item.icon}
      {item.label}
    </Badge>
  );
}

function StatusBadge({ row }: { row: ParticipantRow }) {
  if (!row.isActive) return <Badge variant="destructive">Desactivado</Badge>;
  if (row.canvasStatus === 'completed') return <Badge variant="accent">Terminado</Badge>;
  if (row.canvasStatus === 'in_progress') return <Badge variant="secondary">Trabajando</Badge>;
  return <Badge variant="outline">Sin iniciar</Badge>;
}

function LiveDot({ live }: { live: boolean }) {
  if (!live) return null;
  return (
    <span className="relative flex size-2" title="Actividad en este momento">
      <span className="bg-accent absolute inline-flex size-2 animate-ping rounded-full opacity-75" />
      <span className="bg-accent relative inline-flex size-2 rounded-full" />
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
      <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${value}%` }} />
    </div>
  );
}

function ParticipantCard({ row, live }: { row: ParticipantRow; live: boolean }) {
  const progress = porcentajeAvance(row.filledModules);

  return (
    <Card className={cn(!row.isActive && 'opacity-60')}>
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate font-medium">
              <LiveDot live={live} />
              {row.fullName}
            </p>
            <p className="text-muted-foreground truncate text-xs">{row.username}</p>
          </div>
          <StatusBadge row={row} />
        </div>

        <div className="border-border/60 mt-2 overflow-hidden rounded border">
          <CanvasThumbnail moduleCounts={row.moduleCounts} />
        </div>

        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="tabular-nums">{progress} %</span>
          <span className="text-muted-foreground tabular-nums">
            {row.noteCount} {row.noteCount === 1 ? 'nota' : 'notas'}
          </span>
        </div>
        <div className="mt-1">
          <ProgressBar value={progress} />
        </div>

        <p className="text-muted-foreground mt-2 truncate text-xs">
          {tiempoRelativo(row.lastActivityAt)}
        </p>

        <div className="mt-2 flex gap-1">
          <Button asChild size="sm" variant="outline" className="flex-1">
            <Link href={`/f/monitoreo/${row.profileId}`}>Abrir</Link>
          </Button>
          {row.canvasId && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/presentacion/${row.canvasId}`}>Proyectar</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ParticipantListItem({ row, live }: { row: ParticipantRow; live: boolean }) {
  const progress = porcentajeAvance(row.filledModules);

  return (
    <Card className={cn(!row.isActive && 'opacity-60')}>
      <CardContent className="flex flex-wrap items-center gap-3 p-3">
        <div className="min-w-40 flex-1">
          <p className="flex items-center gap-1.5 truncate font-medium">
            <LiveDot live={live} />
            {row.fullName}
          </p>
          <p className="text-muted-foreground truncate text-xs">{row.username}</p>
        </div>

        <StatusBadge row={row} />

        <div className="w-32">
          <ProgressBar value={progress} />
          <p className="text-muted-foreground mt-1 text-xs tabular-nums">{progress} %</p>
        </div>

        <span className="text-muted-foreground w-20 text-xs tabular-nums">
          {row.noteCount} {row.noteCount === 1 ? 'nota' : 'notas'}
        </span>

        <span className="text-muted-foreground w-32 truncate text-xs">
          {tiempoRelativo(row.lastActivityAt)}
        </span>

        <div className="ml-auto flex gap-1">
          <Button asChild size="sm" variant="outline">
            <Link href={`/f/monitoreo/${row.profileId}`}>Abrir</Link>
          </Button>
          {row.canvasId && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/presentacion/${row.canvasId}`}>Proyectar</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
