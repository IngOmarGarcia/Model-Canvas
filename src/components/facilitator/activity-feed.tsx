import {
  FilePlus2,
  MoveRight,
  PencilLine,
  Sparkles,
  Trash2,
  UserMinus,
  UserPlus,
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { MODULE_BY_KEY, isModuleKey } from '@/lib/bmc/modules';
import { tiempoRelativo } from '@/lib/utils';

export interface ActivityItem {
  id: number;
  type: string;
  createdAt: Date;
  actorName: string | null;
  moduleKey: string | null;
}

/** Verbo y icono por tipo de evento. El payload no trae texto de notas (docs/09). */
const LABELS: Record<string, { verb: string; icon: React.ReactNode }> = {
  'note.created': { verb: 'agregó una nota', icon: <FilePlus2 className="size-3.5" /> },
  'note.updated': { verb: 'editó una nota', icon: <PencilLine className="size-3.5" /> },
  'note.moved': { verb: 'movió una nota', icon: <MoveRight className="size-3.5" /> },
  'note.deleted': { verb: 'eliminó una nota', icon: <Trash2 className="size-3.5" /> },
  'canvas.completed': { verb: 'terminó su lienzo', icon: <Sparkles className="size-3.5" /> },
  'participant.created': { verb: 'fue dado de alta', icon: <UserPlus className="size-3.5" /> },
  'participant.disabled': { verb: 'fue desactivado', icon: <UserMinus className="size-3.5" /> },
  'analysis.completed': { verb: 'recibió un análisis', icon: <Sparkles className="size-3.5" /> },
};

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground text-sm">
            Todavía no hay actividad en esta capacitación.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-border divide-y">
          {items.map((item) => {
            const label = LABELS[item.type] ?? {
              verb: item.type,
              icon: <PencilLine className="size-3.5" />,
            };
            const moduleName =
              item.moduleKey && isModuleKey(item.moduleKey)
                ? MODULE_BY_KEY[item.moduleKey].name
                : null;

            return (
              <li key={item.id} className="flex items-center gap-2.5 px-4 py-2.5 text-sm">
                <span className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-full">
                  {label.icon}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  <strong className="font-medium">{item.actorName ?? 'Alguien'}</strong>{' '}
                  {label.verb}
                  {moduleName && <span className="text-muted-foreground"> en {moduleName}</span>}
                </span>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {tiempoRelativo(item.createdAt)}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
