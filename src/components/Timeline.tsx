import { useMemo } from 'react';
import type { BaseChartProps } from '../types/charts';
import type { TimelineEventInput, TimelineOrientation } from '../core/timeline';
import { computeTimeline } from '../core/timeline';
import { getPlotArea } from '../core/geometry';
import { Surface } from './Surface';
import { RoughLine } from '../primitives/RoughLine';
import { RoughCircle } from '../primitives/RoughCircle';
import { RoughText } from '../primitives/RoughText';

export interface TimelineProps extends BaseChartProps {
  events: TimelineEventInput[];
  orientation?: TimelineOrientation;
}

/**
 * Timeline: ordered events along a central axis, their label blocks alternating
 * to either side so they don't collide. `computeTimeline` does the geometry; a
 * marker, a connector stub and the date/title/detail text draw each event.
 */
export function Timeline({
  events,
  width,
  height,
  margin,
  vibe,
  title,
  description,
  ariaLabel,
  className,
  style,
  bare,
  orientation,
}: TimelineProps) {
  const plot = getPlotArea(width, height, margin);

  const layout = useMemo(
    () => computeTimeline(events, [plot.width, plot.height], { orientation }),
    [events, plot.width, plot.height, orientation],
  );

  const labelWidth = layout.orientation === 'horizontal' ? plot.width / Math.max(1, events.length) - 8 : undefined;

  return (
    <Surface
      width={width}
      height={height}
      vibe={vibe}
      title={title}
      description={description}
      ariaLabel={ariaLabel}
      className={className}
      style={style}
      bare={bare}
    >
      <g transform={`translate(${plot.x}, ${plot.y})`}>
        <RoughLine x1={layout.axis.x1} y1={layout.axis.y1} x2={layout.axis.x2} y2={layout.axis.y2} />

        {layout.events.map((e, i) => (
          <g key={i}>
            <RoughLine x1={e.marker.x} y1={e.marker.y} x2={e.label_at.x} y2={e.label_at.y} seed={i + 1} />
            <RoughCircle cx={e.marker.x} cy={e.marker.y} diameter={11} fill="#ffffff" seed={i + 1} />
            {e.date && (
              <RoughText x={e.label_at.x} y={e.label_at.y - 14} anchor={e.anchor} baseline="middle">
                {e.date}
              </RoughText>
            )}
            <RoughText x={e.label_at.x} y={e.label_at.y} anchor={e.anchor} baseline="middle">
              {e.label}
            </RoughText>
            {e.detail && (
              <RoughText
                x={e.label_at.x}
                y={e.label_at.y + 14}
                anchor={e.anchor}
                baseline="middle"
                maxWidth={labelWidth}
              >
                {e.detail}
              </RoughText>
            )}
          </g>
        ))}
      </g>
    </Surface>
  );
}
