import type { PlotArea } from '../types/geometry';
import type { AnyScale } from '../core/ticks';
import { ticksForScale } from '../core/ticks';
import { RoughLine } from '../primitives/RoughLine';
import { useVibeContext } from '../vibe/VibeProvider';
import type { VibeConfig } from '../types/vibe';

export interface GridProps {
  plot: PlotArea;
  xScale?: AnyScale;
  yScale?: AnyScale;
  ticks?: number;
}

/**
 * Faint gridlines aligned to axis ticks. Derives a calmer vibe from context so
 * the grid never competes with the data — same preset, less roughness, muted
 * stroke.
 */
export function Grid({ plot, xScale, yScale, ticks }: GridProps) {
  const vibe = useVibeContext();
  const gridVibe: VibeConfig = {
    preset: vibe.preset,
    roughness: Math.min(vibe.roughness, 0.6),
    strokeWidth: 0.75,
    stroke: '#d1d5db',
  };

  return (
    <g>
      {xScale &&
        ticksForScale(xScale, ticks).map((t) => (
          <RoughLine
            key={`vx-${t.value}`}
            x1={t.offset}
            y1={plot.y}
            x2={t.offset}
            y2={plot.y + plot.height}
            vibe={gridVibe}
          />
        ))}
      {yScale &&
        ticksForScale(yScale, ticks).map((t) => (
          <RoughLine
            key={`hy-${t.value}`}
            x1={plot.x}
            y1={t.offset}
            x2={plot.x + plot.width}
            y2={t.offset}
            vibe={gridVibe}
          />
        ))}
    </g>
  );
}
