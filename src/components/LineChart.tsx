import { useMemo } from 'react';
import type { AxisFormat, BaseChartProps, Series } from '../types/charts';
import { linearScale, extentOf } from '../core/scales';
import { resolveDomain, tickFormatter } from '../core/axisFormat';
import { linePath } from '../core/shapes';
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
import type { EmphasisSpec } from '../core/annotations';
import { resolveEmphasis } from '../core/emphasis';
import { RoughPath } from '../primitives/RoughPath';
import { RoughCircle } from '../primitives/RoughCircle';
import { markAttrs } from '../core/interaction';
import { useSeriesVisibility } from './SeriesVisibilityContext';

export interface LineChartProps extends BaseChartProps {
  series: Series[];
  curve?: CurveName;
  showPoints?: boolean;
  showAxes?: boolean;
  showGrid?: boolean;
  /** Show a legend below the plot for multi-series data. Defaults to on. */
  showLegend?: boolean;
  annotations?: Annotation[];
  /** Data-relative emphasis: trend lines, auto-callouts, series highlighting. */
  emphasis?: EmphasisSpec[];
  xAxis?: AxisFormat;
  yAxis?: AxisFormat;
}

/** Multi-series line chart: d3-shape builds each path, `<RoughPath>` sketches it. */
export function LineChart({
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
  showPoints = false,
  showAxes = true,
  showGrid = true,
  showLegend = true,
  annotations,
  emphasis,
  xAxis,
  yAxis,
}: LineChartProps) {
  const fullPlot = getPlotArea(width, height, margin);
  const rv = resolveVibe(vibe);
  const palette = resolveBrand(brand).palette;
  const { hidden } = useSeriesVisibility();
  const legendItems: LegendItem[] =
    showLegend && series.length > 1 ? series.map((s, i) => ({ label: s.id, color: s.color ?? colorAt(i, palette) })) : [];
  const legendModel = legendItems.length
    ? layoutLegend(legendItems, fullPlot.width, { fontSize: rv.fontSize, fontFamily: rv.fontFamily })
    : null;
  const plot = legendModel ? { ...fullPlot, height: Math.max(1, fullPlot.height - legendModel.height - 36) } : fullPlot;

  const resolved = useMemo(() => resolveEmphasis(series, emphasis ?? []), [series, emphasis]);
  const overlay = emphasis ? [...(annotations ?? []), ...resolved.annotations] : annotations;

  const { x, y, lines } = useMemo(() => {
    // Lay out and rescale to the visible series only; keep colour tied to each
    // series' original index so hiding one never recolours the rest.
    const visible = series.filter((s) => !hidden.has(s.id));
    const allPoints = visible.flatMap((s) => s.points);
    const xs = allPoints.map((p) => p.x);
    const ys = allPoints.map((p) => p.y);
    const xScale = linearScale(resolveDomain(xs, extentOf(xs, false), xAxis), [plot.x, plot.x + plot.width]);
    const yScale = linearScale(resolveDomain(ys, extentOf(ys), yAxis), [plot.y + plot.height, plot.y]);

    const computed = visible.map((s) => {
      const i = series.indexOf(s);
      const pixels = s.points.map((p) => ({ x: xScale(p.x), y: yScale(p.y) }));
      return {
        id: s.id,
        color: s.color ?? colorAt(i, palette),
        d: linePath(pixels, curve),
        pixels,
        points: s.points,
      };
    });

    return { x: xScale, y: yScale, lines: computed };
  }, [series, curve, plot.x, plot.y, plot.width, plot.height, xAxis, yAxis, palette, hidden]);

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
      {lines.map((line, i) => (
        <g key={line.id} style={resolved.muted.has(line.id) ? { opacity: 0.22 } : undefined}>
          <RoughPath d={line.d} stroke={line.color} fill={null} seed={i + 1} />
          {showPoints &&
            line.pixels.map((p, j) => (
              <RoughCircle key={j} cx={p.x} cy={p.y} diameter={8} fill={line.color} seed={i * 100 + j + 1} />
            ))}
          {/* Inert transparent hit targets per datum: the line is one merged path,
              so per-point hover needs an addressable element. */}
          {line.pixels.map((p, j) => (
            <circle
              key={`hit-${j}`}
              cx={p.x}
              cy={p.y}
              r={10}
              fill="transparent"
              {...markAttrs({
                kind: 'point',
                series: line.id,
                index: j,
                value: { x: line.points[j].x, y: line.points[j].y },
                cx: p.x,
                cy: p.y,
              })}
            />
          ))}
        </g>
      ))}
      {overlay && <Annotations annotations={overlay} plot={plot} xScale={x} yScale={y} />}
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
