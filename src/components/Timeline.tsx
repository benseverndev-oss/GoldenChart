import { useMemo } from 'react';
import type { BaseChartProps } from '../types/charts';
import type { TimelineEventInput, TimelineOrientation } from '../core/timeline';
import { computeTimeline } from '../core/timeline';
import { getPlotArea } from '../core/geometry';
import { wrapText } from '../core/text';
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

  const vertical = layout.orientation === 'vertical';
  const labelWidth = vertical
    ? Math.max(80, plot.width / 2 - 44)
    : Math.max(60, plot.width / Math.max(1, events.length) - 10);
  const LINE_H = 15;

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

        {layout.events.map((e, i) => {
          // Stack date / title / wrapped detail as one block that grows away
          // from the axis (above events grow up, below events grow down), so
          // the lines never collide with the marker or each other.
          const lines: { text: string; muted: boolean }[] = [];
          if (e.date) lines.push({ text: e.date, muted: true });
          lines.push({ text: e.label, muted: false });
          if (e.detail) for (const l of wrapText(e.detail, labelWidth, 11, 'sans-serif')) lines.push({ text: l, muted: true });
          const n = lines.length;
          const lineY = (li: number) =>
            vertical
              ? e.label_at.y + (li - (n - 1) / 2) * LINE_H
              : e.side < 0
                ? e.label_at.y - (n - 1 - li) * LINE_H
                : e.label_at.y + li * LINE_H;
          return (
            <g key={i}>
              <RoughLine x1={e.marker.x} y1={e.marker.y} x2={e.label_at.x} y2={e.label_at.y} seed={i + 1} />
              <RoughCircle cx={e.marker.x} cy={e.marker.y} diameter={11} fill="#ffffff" seed={i + 1} />
              {lines.map((ln, li) => (
                <RoughText
                  key={li}
                  x={e.label_at.x}
                  y={lineY(li)}
                  anchor={e.anchor}
                  baseline="middle"
                  fill={ln.muted ? '#6b7280' : undefined}
                >
                  {ln.text}
                </RoughText>
              ))}
            </g>
          );
        })}
      </g>
    </Surface>
  );
}
