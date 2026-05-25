import { useMemo } from 'react';
import type { BaseChartProps, Series } from '../types/charts';
import { linearScale, extentOf } from '../core/scales';
import { linePath } from '../core/shapes';
import type { CurveName } from '../core/shapes';
import { getPlotArea } from '../core/geometry';
import { colorAt } from '../core/palette';
import { seriesTable } from '../core/dataTable';
import { Surface } from './Surface';
import { Axis } from './Axis';
import { Grid } from './Grid';
import { Annotations } from './Annotations';
import type { Annotation } from './Annotations';
import { RoughPath } from '../primitives/RoughPath';
import { RoughCircle } from '../primitives/RoughCircle';

export interface LineChartProps extends BaseChartProps {
  series: Series[];
  curve?: CurveName;
  showPoints?: boolean;
  showAxes?: boolean;
  showGrid?: boolean;
  annotations?: Annotation[];
}

/** Multi-series line chart: d3-shape builds each path, `<RoughPath>` sketches it. */
export function LineChart({
  series,
  width,
  height,
  margin,
  vibe,
  title,
  description,
  ariaLabel,
  dataTable,
  className,
  style,
  bare,
  curve = 'linear',
  showPoints = false,
  showAxes = true,
  showGrid = true,
  annotations,
}: LineChartProps) {
  const plot = getPlotArea(width, height, margin);

  const { x, y, lines } = useMemo(() => {
    const allPoints = series.flatMap((s) => s.points);
    const xScale = linearScale(extentOf(allPoints.map((p) => p.x), false), [plot.x, plot.x + plot.width]);
    const yScale = linearScale(extentOf(allPoints.map((p) => p.y)), [plot.y + plot.height, plot.y]);

    const computed = series.map((s, i) => {
      const pixels = s.points.map((p) => ({ x: xScale(p.x), y: yScale(p.y) }));
      return {
        id: s.id,
        color: s.color ?? colorAt(i),
        d: linePath(pixels, curve),
        pixels,
      };
    });

    return { x: xScale, y: yScale, lines: computed };
  }, [series, curve, plot.x, plot.y, plot.width, plot.height]);

  return (
    <Surface
      width={width}
      height={height}
      vibe={vibe}
      title={title}
      description={description}
      ariaLabel={ariaLabel}
      dataTable={dataTable ? seriesTable(series, title) : undefined}
      className={className}
      style={style}
      bare={bare}
    >
      {showGrid && <Grid plot={plot} xScale={x} yScale={y} />}
      {lines.map((line, i) => (
        <g key={line.id}>
          <RoughPath d={line.d} stroke={line.color} fill={null} seed={i + 1} />
          {showPoints &&
            line.pixels.map((p, j) => (
              <RoughCircle key={j} cx={p.x} cy={p.y} diameter={8} fill={line.color} seed={i * 100 + j + 1} />
            ))}
        </g>
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
