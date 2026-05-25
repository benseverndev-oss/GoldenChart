import type { PlotArea } from '../types/geometry';
import type { AnyScale, Tick } from '../core/ticks';
import { ticksForScale } from '../core/ticks';
import { RoughLine } from '../primitives/RoughLine';
import { RoughText } from '../primitives/RoughText';

export type AxisOrientation = 'top' | 'right' | 'bottom' | 'left';

export interface AxisProps {
  scale: AnyScale;
  orientation: AxisOrientation;
  plot: PlotArea;
  ticks?: number;
  tickFormat?: (value: string | number) => string;
  /** Length of each tick mark in px. */
  tickSize?: number;
}

/**
 * A vibe-aware axis. Works in absolute surface coordinates, so charts can place
 * it without a transform as long as their scales are ranged in those same
 * coordinates. Tick positions come from the DOM-free `ticksForScale` helper.
 */
export function Axis({ scale, orientation, plot, ticks, tickFormat, tickSize = 6 }: AxisProps) {
  const marks = ticksForScale(scale, ticks);
  const format = tickFormat ?? ((v: string | number) => String(v));
  const horizontal = orientation === 'top' || orientation === 'bottom';

  if (horizontal) {
    const y = orientation === 'bottom' ? plot.y + plot.height : plot.y;
    const dir = orientation === 'bottom' ? 1 : -1;
    return (
      <g>
        <RoughLine x1={plot.x} y1={y} x2={plot.x + plot.width} y2={y} />
        {marks.map((t: Tick) => (
          <g key={String(t.value)}>
            <RoughLine x1={t.offset} y1={y} x2={t.offset} y2={y + dir * tickSize} />
            <RoughText
              x={t.offset}
              y={y + dir * (tickSize + 6)}
              anchor="middle"
              baseline={orientation === 'bottom' ? 'hanging' : 'auto'}
            >
              {format(t.value)}
            </RoughText>
          </g>
        ))}
      </g>
    );
  }

  const x = orientation === 'left' ? plot.x : plot.x + plot.width;
  const dir = orientation === 'left' ? -1 : 1;
  return (
    <g>
      <RoughLine x1={x} y1={plot.y} x2={x} y2={plot.y + plot.height} />
      {marks.map((t: Tick) => (
        <g key={String(t.value)}>
          <RoughLine x1={x} y1={t.offset} x2={x + dir * tickSize} y2={t.offset} />
          <RoughText
            x={x + dir * (tickSize + 4)}
            y={t.offset}
            anchor={orientation === 'left' ? 'end' : 'start'}
            baseline="middle"
          >
            {format(t.value)}
          </RoughText>
        </g>
      ))}
    </g>
  );
}
