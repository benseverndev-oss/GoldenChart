import { useMemo } from 'react';
import type { BaseChartProps, Series } from '../types/charts';
import { linearScale, extentOf } from '../core/scales';
import { areaPath, linePath } from '../core/shapes';
import type { CurveName } from '../core/shapes';
import { getPlotArea } from '../core/geometry';
import { colorAt } from '../core/palette';
import { Surface } from './Surface';
import { Axis } from './Axis';
import { Grid } from './Grid';
import { RoughPath } from '../primitives/RoughPath';

export interface AreaChartProps extends BaseChartProps {
  series: Series[];
  curve?: CurveName;
  /** Data-space y-value the area fills down to. */
  baseline?: number;
  showLine?: boolean;
  showAxes?: boolean;
  showGrid?: boolean;
}

/**
 * Filled area chart — the strongest showcase for Rough.js hachure/zigzag fills.
 * d3-shape's `area` builds the fill path; the vibe's `fillStyle` textures it.
 */
export function AreaChart({
  series,
  width,
  height,
  margin,
  vibe,
  title,
  className,
  style,
  curve = 'linear',
  baseline = 0,
  showLine = true,
  showAxes = true,
  showGrid = true,
}: AreaChartProps) {
  const plot = getPlotArea(width, height, margin);

  const { x, y, areas } = useMemo(() => {
    const allPoints = series.flatMap((s) => s.points);
    const xScale = linearScale(extentOf(allPoints.map((p) => p.x), false), [plot.x, plot.x + plot.width]);
    const yScale = linearScale(extentOf([...allPoints.map((p) => p.y), baseline]), [
      plot.y + plot.height,
      plot.y,
    ]);
    const y0 = yScale(baseline);

    const computed = series.map((s, i) => {
      const pixels = s.points.map((p) => ({ x: xScale(p.x), y: yScale(p.y) }));
      return {
        id: s.id,
        color: s.color ?? colorAt(i),
        fill: areaPath(pixels, y0, curve),
        line: linePath(pixels, curve),
      };
    });

    return { x: xScale, y: yScale, areas: computed };
  }, [series, curve, baseline, plot.x, plot.y, plot.width, plot.height]);

  return (
    <Surface width={width} height={height} vibe={vibe} title={title} className={className} style={style}>
      {showGrid && <Grid plot={plot} xScale={x} yScale={y} />}
      {areas.map((a, i) => (
        <g key={a.id}>
          <RoughPath d={a.fill} fill={a.color} seed={i + 1} />
          {showLine && <RoughPath d={a.line} stroke={a.color} fill={null} seed={i + 50} />}
        </g>
      ))}
      {showAxes && (
        <>
          <Axis scale={x} orientation="bottom" plot={plot} />
          <Axis scale={y} orientation="left" plot={plot} />
        </>
      )}
    </Surface>
  );
}
