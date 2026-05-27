import { useMemo } from 'react';
import type { AxisFormat, BaseChartProps, Series } from '../types/charts';
import { linearScale, extentOf } from '../core/scales';
import { resolveDomain, tickFormatter } from '../core/axisFormat';
import { areaPath, linePath } from '../core/shapes';
import type { CurveName } from '../core/shapes';
import { getPlotArea } from '../core/geometry';
import { colorAt } from '../core/palette';
import { resolveBrand } from '../brand/resolveBrand';
import { seriesTable } from '../core/dataTable';
import { layoutLegend } from '../core/legend';
import type { LegendItem } from '../core/legend';
import { resolveVibe } from '../vibe/resolveVibe';
import { Surface } from './Surface';
import { Axis } from './Axis';
import { Grid } from './Grid';
import { Legend } from './Legend';
import { Annotations } from './Annotations';
import type { Annotation } from './Annotations';
import { RoughPath } from '../primitives/RoughPath';
import { markAttrs } from '../core/interaction';

export interface AreaChartProps extends BaseChartProps {
  series: Series[];
  curve?: CurveName;
  /** Data-space y-value the area fills down to. */
  baseline?: number;
  showLine?: boolean;
  /** Stack series on top of each other (assumes points are index-aligned). */
  stacked?: boolean;
  showAxes?: boolean;
  showGrid?: boolean;
  /** Show a legend below the plot for multi-series data. Defaults to on. */
  showLegend?: boolean;
  annotations?: Annotation[];
  xAxis?: AxisFormat;
  yAxis?: AxisFormat;
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
  brand,
  title,
  description,
  ariaLabel,
  dataTable,
  className,
  style,
  bare,
  curve = 'linear',
  baseline = 0,
  showLine = true,
  stacked = false,
  showAxes = true,
  showGrid = true,
  showLegend = true,
  annotations,
  xAxis,
  yAxis,
}: AreaChartProps) {
  const fullPlot = getPlotArea(width, height, margin);
  const rv = resolveVibe(vibe);
  const palette = resolveBrand(brand).palette;
  const legendItems: LegendItem[] =
    showLegend && series.length > 1 ? series.map((s, i) => ({ label: s.id, color: s.color ?? colorAt(i, palette) })) : [];
  const legendModel = legendItems.length
    ? layoutLegend(legendItems, fullPlot.width, { fontSize: rv.fontSize, fontFamily: rv.fontFamily })
    : null;
  const plot = legendModel ? { ...fullPlot, height: Math.max(1, fullPlot.height - legendModel.height - 36) } : fullPlot;

  const { x, y, areas } = useMemo(() => {
    const allPoints = series.flatMap((s) => s.points);
    const xs = allPoints.map((p) => p.x);
    const xScale = linearScale(resolveDomain(xs, extentOf(xs, false), xAxis), [plot.x, plot.x + plot.width]);

    if (stacked) {
      const count = Math.max(0, ...series.map((s) => s.points.length));
      const cumulative = new Array<number>(count).fill(0);
      const totals = new Array<number>(count).fill(0);
      for (const s of series) s.points.forEach((p, idx) => (totals[idx] += p.y));
      const yScale = linearScale([0, Math.max(1, ...totals)], [plot.y + plot.height, plot.y]);

      const computed = series.map((s, i) => {
        const top = s.points.map((p, idx) => ({ x: xScale(p.x), y: yScale(cumulative[idx] + p.y) }));
        const bottom = s.points.map((p, idx) => ({ x: xScale(p.x), y: yScale(cumulative[idx]) }));
        s.points.forEach((p, idx) => (cumulative[idx] += p.y));
        const fill =
          `M${top.map((p) => `${p.x},${p.y}`).join(' L')} ` +
          `L${[...bottom].reverse().map((p) => `${p.x},${p.y}`).join(' L')} Z`;
        return { id: s.id, color: s.color ?? colorAt(i, palette), fill, line: linePath(top, curve), pixels: top, points: s.points };
      });

      return { x: xScale, y: yScale, areas: computed };
    }

    const yValues = [...allPoints.map((p) => p.y), baseline];
    const yScale = linearScale(resolveDomain(yValues, extentOf(yValues), yAxis), [plot.y + plot.height, plot.y]);
    const y0 = yScale(baseline);

    const computed = series.map((s, i) => {
      const pixels = s.points.map((p) => ({ x: xScale(p.x), y: yScale(p.y) }));
      return {
        id: s.id,
        color: s.color ?? colorAt(i, palette),
        fill: areaPath(pixels, y0, curve),
        line: linePath(pixels, curve),
        pixels,
        points: s.points,
      };
    });

    return { x: xScale, y: yScale, areas: computed };
  }, [series, curve, baseline, stacked, plot.x, plot.y, plot.width, plot.height, xAxis, yAxis, palette]);

  return (
    <Surface
      width={width}
      height={height}
      vibe={vibe}
      brand={brand}
      title={title}
      description={description}
      ariaLabel={ariaLabel}
      dataTable={dataTable ? seriesTable(series, title) : undefined}
      className={className}
      style={style}
      bare={bare}
    >
      {showGrid && <Grid plot={plot} xScale={x} yScale={y} />}
      {areas.map((a, i) => (
        <g key={a.id}>
          <RoughPath d={a.fill} fill={a.color} seed={i + 1} />
          {showLine && <RoughPath d={a.line} stroke={a.color} fill={null} seed={i + 50} />}
          {/* Inert transparent hit targets per datum (the area/line is a merged path). */}
          {a.pixels.map((p, j) => (
            <circle
              key={`hit-${j}`}
              cx={p.x}
              cy={p.y}
              r={10}
              fill="transparent"
              {...markAttrs({
                kind: 'point',
                series: a.id,
                index: j,
                value: { x: a.points[j].x, y: a.points[j].y },
                cx: p.x,
                cy: p.y,
              })}
            />
          ))}
        </g>
      ))}
      {annotations && <Annotations annotations={annotations} plot={plot} xScale={x} yScale={y} />}
      {showAxes && (
        <>
          <Axis scale={x} orientation="bottom" plot={plot} tickFormat={tickFormatter(xAxis)} ticks={xAxis?.tickCount} />
          <Axis scale={y} orientation="left" plot={plot} tickFormat={tickFormatter(yAxis)} ticks={yAxis?.tickCount} />
        </>
      )}
      {legendModel && <Legend items={legendItems} x={fullPlot.x} y={plot.y + plot.height + 30} width={fullPlot.width} />}
    </Surface>
  );
}
