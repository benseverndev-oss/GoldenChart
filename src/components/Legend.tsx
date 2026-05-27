import { layoutLegend } from '../core/legend';
import type { LegendItem } from '../core/legend';
import { useResolvedVibe } from '../vibe/VibeProvider';
import { RoughRectangle } from '../primitives/RoughRectangle';
import { RoughText } from '../primitives/RoughText';

export type { LegendItem };

export interface LegendProps {
  items: LegendItem[];
  /** Top-left of the legend block. */
  x: number;
  y: number;
  /** Width to centre/wrap the items within (typically the plot width). */
  width: number;
}

const SWATCH = 14;
const SWATCH_GAP = 6;

/**
 * Vibe-aware legend: swatch + label per item, flowed into centred rows that wrap
 * within `width`. Lay it out below the plot (the chart reserves the band) so it
 * never overlaps the data. Geometry comes from the pure `layoutLegend`.
 */
export function Legend({ items, x, y, width }: LegendProps) {
  const resolved = useResolvedVibe();
  const layout = layoutLegend(items, width, {
    swatchSize: SWATCH,
    swatchGap: SWATCH_GAP,
    fontSize: resolved.fontSize,
    fontFamily: resolved.fontFamily,
  });
  return (
    <g>
      {layout.rows.map((it, i) => (
        <g key={it.label}>
          <RoughRectangle x={x + it.x} y={y + it.y - SWATCH / 2} width={SWATCH} height={SWATCH} fill={it.color} seed={i + 1} />
          <RoughText x={x + it.x + SWATCH + SWATCH_GAP} y={y + it.y} anchor="start" baseline="middle">
            {it.label}
          </RoughText>
        </g>
      ))}
    </g>
  );
}
