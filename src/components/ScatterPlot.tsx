import { useMemo } from 'react';
import type { BaseChartProps } from '../types/charts';
import { linearScale, sqrtScale, extentOf } from '../core/scales';
import { getPlotArea } from '../core/geometry';
import { Surface } from './Surface';
import { Axis } from './Axis';
import { Grid } from './Grid';
import { Annotations } from './Annotations';
import type { Annotation } from './Annotations';
import { RoughCircle } from '../primitives/RoughCircle';
import { useVibeContext } from '../vibe/VibeProvider';

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
}

/** Scatter / bubble chart: each datum maps to a sketchy `<RoughCircle>`. */
export function ScatterPlot({
  data,
  width,
  height,
  margin,
  vibe,
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
}: ScatterPlotProps) {
  const plot = getPlotArea(width, height, margin);

  const { x, y, points } = useMemo(() => {
    const xScale = linearScale(extentOf(data.map((d) => d.x), false), [plot.x, plot.x + plot.width]);
    const yScale = linearScale(extentOf(data.map((d) => d.y), false), [plot.y + plot.height, plot.y]);
    const rValues = data.map((d) => d.r).filter((r): r is number => r !== undefined);
    const rScale = rValues.length ? sqrtScale([0, Math.max(...rValues)], [2, maxRadius]) : null;

    const computed = data.map((d) => ({
      cx: xScale(d.x),
      cy: yScale(d.y),
      r: d.r !== undefined && rScale ? rScale(d.r) : radius,
      color: d.color,
    }));

    return { x: xScale, y: yScale, points: computed };
  }, [data, radius, maxRadius, plot.x, plot.y, plot.width, plot.height]);

  return (
    <Surface
      width={width}
      height={height}
      vibe={vibe}
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
      {annotations && <Annotations annotations={annotations} plot={plot} xScale={x} yScale={y} />}
      {showAxes && (
        <>
          <Axis scale={x} orientation="bottom" plot={plot} />
          <Axis scale={y} orientation="left" plot={plot} />
        </>
      )}
    </Surface>
  );
}

function ScatterDot({
  point,
  index,
}: {
  point: { cx: number; cy: number; r: number; color?: string };
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
    />
  );
}
