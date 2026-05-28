import type { KeyboardEvent } from 'react';
import { layoutLegend } from '../core/legend';
import type { LegendItem } from '../core/legend';
import { useResolvedVibe } from '../vibe/VibeProvider';
import { useSeriesVisibility } from './SeriesVisibilityContext';
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
  const { hidden, toggle, interactive } = useSeriesVisibility();
  const layout = layoutLegend(items, width, {
    swatchSize: SWATCH,
    swatchGap: SWATCH_GAP,
    fontSize: resolved.fontSize,
    fontFamily: resolved.fontFamily,
  });
  return (
    <g>
      {layout.rows.map((it, i) => {
        const isHidden = hidden.has(it.label);
        // Interactive attributes are gated so the static (non-interactive) render
        // is byte-identical; dimming is keyed on `hidden`, empty by default.
        const interactiveProps = interactive
          ? {
              role: 'button' as const,
              tabIndex: 0,
              'aria-pressed': !isHidden,
              style: { cursor: 'pointer' as const },
              onClick: () => toggle(it.label),
              onKeyDown: (e: KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggle(it.label);
                }
              },
            }
          : {};
        return (
          <g key={it.label} opacity={isHidden ? 0.4 : undefined} {...interactiveProps}>
            <RoughRectangle
              x={x + it.x}
              y={y + it.y - SWATCH / 2}
              width={SWATCH}
              height={SWATCH}
              fill={it.color}
              seed={i + 1}
            />
            <RoughText
              x={x + it.x + SWATCH + SWATCH_GAP}
              y={y + it.y}
              anchor="start"
              baseline="middle"
            >
              {it.label}
            </RoughText>
          </g>
        );
      })}
    </g>
  );
}
