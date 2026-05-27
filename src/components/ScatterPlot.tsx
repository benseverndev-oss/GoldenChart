import { useMemo } from 'react';
import type { AxisFormat, BaseChartProps } from '../types/charts';
import { linearScale, sqrtScale, extentOf } from '../core/scales';
import { resolveDomain, tickFormatter } from '../core/axisFormat';
import { getPlotArea } from '../core/geometry';
import { Surface } from './Surface';
import { Axis } from './Axis';
import { Grid } from './Grid';
import { Annotations } from './Annotations';
import type { Annotation } from './Annotations';
import type { EmphasisSpec } from '../core/annotations';
import { resolveEmphasis } from '../core/emphasis';
import { RoughCircle } from '../primitives/RoughCircle';
import { useVibeContext } from '../vibe/VibeProvider';
import { markAttrs } from '../core/interaction';

export interface ScatterDatum {
  x: number;
  y: number;
  /** Optional data-space magnitude driving the bubble radius. */
  r?: number;
  color?: string;
  label?: string;
}

export interface ScatterPlotProps extends BaseChartProps {
  data: ScatterDatum[];
  /** Marker radius (px) used when a datum has no `r`. */
  radius?: number;
  /** Max bubble radius (px) when data carries `r`. */
  maxRadius?: number;
  showAxes?: boolean;
  showGrid?: boolean;
  annotations?: Annotation[];
  /** Data-relative emphasis: a regression/mean trend line, auto-callouts. */
  emphasis?: EmphasisSpec[];
  xAxis?: AxisFormat;
  yAxis?: AxisFormat;
}

/** Scatter / bubble chart: each datum maps to a sketchy `<RoughCircle>`. */
export function ScatterPlot({
  data,
  width,
  height,
  margin,
  vibe,
  brand,
  title,
  className,
  style,
  bare,
  description,
  ariaLabel,
  dataTable,
  radius = 5,
  maxRadius = 18,
  showAxes = true,
  showGrid = true,
  annotations,
  emphasis,
  xAxis,
  yAxis,
}: ScatterPlotProps) {
  const plot = getPlotArea(width, height, margin);
  const overlay = useMemo(() => {
    if (!emphasis) return annotations;
    const synthetic = [{ id: 'data', points: data.map((d) => ({ x: d.x, y: d.y })) }];
    return [...(annotations ?? []), ...resolveEmphasis(synthetic, emphasis).annotations];
  }, [annotations, emphasis, data]);

  const { x, y, points } = useMemo(() => {
    const xs = data.map((d) => d.x);
    const ys = data.map((d) => d.y);
    const xScale = linearScale(resolveDomain(xs, extentOf(xs, false), xAxis), [plot.x, plot.x + plot.width]);
    const yScale = linearScale(resolveDomain(ys, extentOf(ys, false), yAxis), [plot.y + plot.height, plot.y]);
    const rValues = data.map((d) => d.r).filter((r): r is number => r !== undefined);
    const rScale = rValues.length ? sqrtScale([0, Math.max(...rValues)], [2, maxRadius]) : null;

    const computed = data.map((d) => ({
      cx: xScale(d.x),
      cy: yScale(d.y),
      r: d.r !== undefined && rScale ? rScale(d.r) : radius,
      color: d.color,
      label: d.label,
      dx: d.x,
      dy: d.y,
    }));

    return { x: xScale, y: yScale, points: computed };
  }, [data, radius, maxRadius, plot.x, plot.y, plot.width, plot.height, xAxis, yAxis]);

  return (
    <Surface
      width={width}
      height={height}
      vibe={vibe}
      brand={brand}
      title={title}
      description={description}
      ariaLabel={ariaLabel}
      dataTable={
        dataTable
          ? { caption: title, columns: ['X', 'Y'], rows: data.map((d) => [d.x, d.y] as (string | number)[]) }
          : undefined
      }
      className={className}
      style={style}
      bare={bare}
    >
      {showGrid && <Grid plot={plot} xScale={x} yScale={y} />}
      {points.map((p, i) => (
        <ScatterDot key={i} point={p} index={i} />
      ))}
      {overlay && <Annotations annotations={overlay} plot={plot} xScale={x} yScale={y} />}
      {showAxes && (
        <>
          <Axis scale={x} orientation="bottom" plot={plot} tickFormat={tickFormatter(xAxis)} ticks={xAxis?.tickCount} />
          <Axis scale={y} orientation="left" plot={plot} tickFormat={tickFormatter(yAxis)} ticks={yAxis?.tickCount} />
        </>
      )}
    </Surface>
  );
}

function ScatterDot({
  point,
  index,
}: {
  point: { cx: number; cy: number; r: number; color?: string; label?: string; dx: number; dy: number };
  index: number;
}) {
  const vibe = useVibeContext();
  return (
    <RoughCircle
      cx={point.cx}
      cy={point.cy}
      diameter={point.r * 2}
      fill={point.color ?? vibe.fill}
      seed={vibe.seed + index + 1}
      dataAttrs={markAttrs({
        kind: 'point',
        index,
        label: point.label,
        value: { x: point.dx, y: point.dy },
        cx: point.cx,
        cy: point.cy,
      })}
    />
  );
}
