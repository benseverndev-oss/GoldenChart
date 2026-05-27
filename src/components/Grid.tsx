import type { PlotArea } from '../types/geometry';
import type { AnyScale } from '../core/ticks';
import { ticksForScale } from '../core/ticks';
import { isDarkColor } from '../core/texture';
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
 * the grid never competes with the data — same preset, a touch less roughness,
 * and a faint hairline whose colour follows the background (a dark line on light
 * vibes, a light line on dark vibes) so it never blows out on dark themes.
 */
export function Grid({ plot, xScale, yScale, ticks }: GridProps) {
  const vibe = useVibeContext();
  const onDark = isDarkColor(vibe.background);
  const gridVibe: VibeConfig = {
    preset: vibe.preset,
    // Always visibly hand-drawn, regardless of how crisp the preset is: floor at
    // 1.0 so even low-roughness presets get a sketched grid, capped at 1.4 so it
    // never overpowers the data.
    roughness: Math.min(Math.max(vibe.roughness, 1.0), 1.4),
    strokeWidth: 0.75,
    // Light line on dark grounds, dark line on light grounds — kept faint via
    // opacity so the grid stays subordinate to the data on every theme.
    stroke: onDark ? '#ffffff' : '#1f2937',
  };
  const faint = { opacity: onDark ? 0.16 : 0.14 } as const;

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
            style={faint}
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
            style={faint}
          />
        ))}
    </g>
  );
}
