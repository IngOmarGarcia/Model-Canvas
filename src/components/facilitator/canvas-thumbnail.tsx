import { CANVAS_LAYOUT } from '@/lib/bmc/layout';
import { cn } from '@/lib/utils';

/**
 * Miniatura del lienzo dibujada como SVG a partir de los contadores por módulo.
 * No es una captura ni un iframe: cuesta lo mismo para 40 participantes que
 * para uno, y se actualiza con los contadores que ya trae el evento.
 */
export function CanvasThumbnail({
  moduleCounts,
  className,
}: {
  moduleCounts: Record<string, number>;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 60"
      className={cn('h-auto w-full', className)}
      role="img"
      aria-label="Miniatura del lienzo"
      preserveAspectRatio="none"
    >
      <rect x="0" y="0" width="100" height="60" fill="var(--canvas-bg)" />

      {CANVAS_LAYOUT.map((placement) => {
        const x = (placement.colStart - 1) * 10;
        const width = (placement.colEnd - placement.colStart) * 10;
        const y = (placement.rowStart - 1) * 20;
        const height = (placement.rowEnd - placement.rowStart) * 20;
        const count = moduleCounts[placement.key] ?? 0;

        // La opacidad satura a las 5 notas: más allá no aporta información.
        const intensity = count === 0 ? 0 : Math.min(1, 0.25 + count * 0.15);

        return (
          <g key={placement.key}>
            <rect
              x={x + 0.5}
              y={y + 0.5}
              width={width - 1}
              height={height - 1}
              rx="1"
              fill="var(--accent)"
              fillOpacity={intensity}
              stroke="var(--module-border)"
              strokeWidth="0.4"
            />
            {count > 0 && (
              <text
                x={x + width / 2}
                y={y + height / 2 + 2.5}
                textAnchor="middle"
                fontSize="6"
                fill="var(--foreground)"
                opacity="0.75"
              >
                {count}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
