import { useMemo } from 'react';
import type { BaseChartProps } from '../types/charts';
import type { TimelineEventInput, TimelineOrientation } from '../core/timeline';
import { computeTimeline } from '../core/timeline';
import { getPlotArea } from '../core/geometry';
import { wrapText } from '../core/text';
import { Surface } from './Surface';
import { useResolvedVibe } from '../vibe/VibeProvider';
import { RoughLine } from '../primitives/RoughLine';
import { RoughCircle } from '../primitives/RoughCircle';
import { RoughText } from '../primitives/RoughText';

const NEAR_GAP = 16; // marker → nearest label line
const LINE_H = 15;

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

  const resolved = useResolvedVibe(vibe);
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

        {layout.events.map((e, i) => {
          // Build the label block as a flat list of single lines (date, label,
          // wrapped detail) so we can place the whole block on one side of the
          // axis with a fixed gap — no line ever crosses the axis.
          const detailLines = e.detail
            ? wrapText(e.detail, labelWidth ?? 9999, resolved.fontSize, resolved.fontFamily)
            : [];
          const lines = [...(e.date ? [e.date] : []), e.label, ...detailLines];
          const blockH = lines.length * LINE_H;

          let lineY: (k: number) => number;
          let lineX = e.label_at.x;
          let connTo = { x: e.marker.x, y: e.marker.y };
          if (layout.orientation === 'horizontal') {
            // Block sits fully above (side -1) or below (side +1) the axis.
            const top = e.side === 1 ? e.marker.y + NEAR_GAP : e.marker.y - NEAR_GAP - blockH;
            lineY = (k) => top + (k + 0.5) * LINE_H;
            lineX = e.marker.x;
            connTo = { x: e.marker.x, y: e.side === 1 ? e.marker.y + NEAR_GAP : e.marker.y - NEAR_GAP };
          } else {
            // Vertical axis: block to the left/right, vertically centred on the marker.
            const top = e.marker.y - blockH / 2;
            lineY = (k) => top + (k + 0.5) * LINE_H;
            connTo = { x: e.label_at.x, y: e.marker.y };
          }

          return (
            <g key={i}>
              <RoughLine x1={e.marker.x} y1={e.marker.y} x2={connTo.x} y2={connTo.y} seed={i + 1} />
              <RoughCircle cx={e.marker.x} cy={e.marker.y} diameter={11} fill="#ffffff" seed={i + 1} />
              {lines.map((ln, k) => (
                <RoughText key={k} x={lineX} y={lineY(k)} anchor={e.anchor} baseline="middle">
                  {ln}
                </RoughText>
              ))}
            </g>
          );
        })}
      </g>
    </Surface>
  );
}
