import type { PlotArea } from '../types/geometry';
import type { Annotation } from '../core/annotations';
import { arrowHeadPath } from '../core/shapes';
import { RoughLine } from '../primitives/RoughLine';
import { RoughRectangle } from '../primitives/RoughRectangle';
import { RoughCircle } from '../primitives/RoughCircle';
import { RoughPath } from '../primitives/RoughPath';
import { RoughText } from '../primitives/RoughText';

export type { Annotation };

export interface AnnotationsProps {
  annotations: Annotation[];
  plot: PlotArea;
  /** Linear data→pixel scale for the x axis (omitted for band-x charts). */
  xScale?: (value: number) => number;
  yScale?: (value: number) => number;
}

const LINE_COLOR = '#ef4444';
const BAND_VIBE = { roughness: 0.8, fillStyle: 'hachure', fillWeight: 0.5 } as const;

/**
 * Overlay annotations on a cartesian chart: reference lines/bands, callouts, and
 * circled points. Renders only the annotations whose required scale is present,
 * so it degrades gracefully on band-axis charts.
 */
export function Annotations({ annotations, plot, xScale, yScale }: AnnotationsProps) {
  return (
    <g>
      {annotations.map((a, i) => {
        const seed = i + 1;
        const color = a.color ?? LINE_COLOR;

        if (a.kind === 'y-line' && yScale) {
          const y = yScale(a.value);
          return (
            <g key={i}>
              <RoughLine x1={plot.x} y1={y} x2={plot.x + plot.width} y2={y} stroke={color} seed={seed} />
              {a.label && (
                <RoughText x={plot.x + plot.width} y={y - 4} anchor="end" baseline="auto" fill={color}>
                  {a.label}
                </RoughText>
              )}
            </g>
          );
        }

        if (a.kind === 'x-line' && xScale) {
          const x = xScale(a.value);
          return (
            <g key={i}>
              <RoughLine x1={x} y1={plot.y} x2={x} y2={plot.y + plot.height} stroke={color} seed={seed} />
              {a.label && (
                <RoughText x={x + 4} y={plot.y + 4} anchor="start" baseline="hanging" fill={color}>
                  {a.label}
                </RoughText>
              )}
            </g>
          );
        }

        if (a.kind === 'y-band' && yScale) {
          const y0 = yScale(a.from);
          const y1 = yScale(a.to);
          return (
            <RoughRectangle
              key={i}
              x={plot.x}
              y={Math.min(y0, y1)}
              width={plot.width}
              height={Math.abs(y1 - y0)}
              fill={color}
              vibe={BAND_VIBE}
              seed={seed}
            />
          );
        }

        if (a.kind === 'x-band' && xScale) {
          const x0 = xScale(a.from);
          const x1 = xScale(a.to);
          return (
            <RoughRectangle
              key={i}
              x={Math.min(x0, x1)}
              y={plot.y}
              width={Math.abs(x1 - x0)}
              height={plot.height}
              fill={color}
              vibe={BAND_VIBE}
              seed={seed}
            />
          );
        }

        if (a.kind === 'circle' && xScale && yScale) {
          const cx = xScale(a.x);
          const cy = yScale(a.y);
          return (
            <g key={i}>
              <RoughCircle cx={cx} cy={cy} diameter={a.r * 2} fill={null} stroke={color} seed={seed} />
              {a.label && (
                <RoughText x={cx} y={cy - a.r - 4} anchor="middle" baseline="auto" fill={color}>
                  {a.label}
                </RoughText>
              )}
            </g>
          );
        }

        if (a.kind === 'segment' && xScale && yScale) {
          const x1 = xScale(a.x1);
          const y1 = yScale(a.y1);
          const x2 = xScale(a.x2);
          const y2 = yScale(a.y2);
          return (
            <g key={i}>
              <RoughLine x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} seed={seed} />
              {a.label && (
                <RoughText x={x2} y={y2 - 4} anchor="end" baseline="auto" fill={color}>
                  {a.label}
                </RoughText>
              )}
            </g>
          );
        }

        if (a.kind === 'point-callout' && xScale && yScale) {
          const px = xScale(a.x);
          const py = yScale(a.y);
          const tx = px + (a.dx ?? 28);
          const ty = py + (a.dy ?? -28);
          return (
            <g key={i}>
              <RoughPath d={`M${tx},${ty} L${px},${py}`} stroke={color} fill={null} seed={seed} />
              <RoughPath d={arrowHeadPath({ x: tx, y: ty }, { x: px, y: py })} stroke={color} fill={null} seed={seed} />
              <RoughText x={tx} y={ty} anchor={tx >= px ? 'start' : 'end'} baseline="middle" fill={color}>
                {a.text}
              </RoughText>
            </g>
          );
        }

        return null;
      })}
    </g>
  );
}
