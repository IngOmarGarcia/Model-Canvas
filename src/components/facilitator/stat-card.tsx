import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
          <Icon name={icon} className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-muted-foreground truncate text-sm">{label}</p>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          {hint && <p className="text-muted-foreground mt-0.5 truncate text-xs">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
