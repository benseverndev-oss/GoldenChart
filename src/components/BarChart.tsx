import { useMemo } from 'react';
import type { AxisFormat, BaseChartProps, ChartDatum, DataTableModel, MultiSeriesDatum } from '../types/charts';
import { bandScale, linearScale, extentOf } from '../core/scales';
import { resolveDomain, tickFormatter } from '../core/axisFormat';
import { getPlotArea } from '../core/geometry';
import { colorAt } from '../core/palette';
import { datumTable } from '../core/dataTable';
import { groupMax, seriesKeysOf, stackLayout, stackMax } from '../core/stack';
import { Surface } from './Surface';
import { Axis } from './Axis';
import { Grid } from './Grid';
import { Legend } from './Legend';
import { Annotations } from './Annotations';
import type { Annotation } from './Annotations';
import { RoughRectangle } from '../primitives/RoughRectangle';
import { useVibeContext } from '../vibe/VibeProvider';

export type BarMode = 'single' | 'grouped' | 'stacked';

export interface BarChartProps extends BaseChartProps {
  data: ChartDatum[] | MultiSeriesDatum[];
  /** `single` (default), `grouped` (side-by-side) or `stacked` multi-series. */
  mode?: BarMode;
  /** Series keys for multi-series modes; defaults to the union of value keys. */
  seriesKeys?: string[];
  showAxes?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
  annotations?: Annotation[];
  /** Value-axis scale/format overrides; category axis takes `xAxis` for labels. */
  xAxis?: AxisFormat;
  yAxis?: AxisFormat;
}

interface LaidBar {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

/**
 * The reference chart for the calc/render split: d3-scale computes bar geometry,
 * `<RoughRectangle>` draws each bar. Supports single, grouped and stacked
 * multi-series modes.
 */
export function BarChart({
  data,
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
  mode = 'single',
  seriesKeys,
  showAxes = true,
  showGrid = true,
  showLegend = true,
  annotations,
  xAxis,
  yAxis,
}: BarChartProps) {
  const plot = getPlotArea(width, height, margin);

  const { x, y, bars, legend, keys } = useMemo(() => {
    if (mode === 'single') {
      const single = data as ChartDatum[];
      const xScale = bandScale(single.map((d) => d.label), [plot.x, plot.x + plot.width]);
      const values = single.map((d) => d.value);
      const yScale = linearScale(resolveDomain(values, extentOf(values), yAxis), [plot.y + plot.height, plot.y]);
      const baseline = yScale(0);
      const computed: LaidBar[] = single.map((d) => {
        const top = yScale(d.value);
        return {
          id: d.label,
          color: d.color,
          x: xScale(d.label) ?? plot.x,
          y: Math.min(top, baseline),
          width: xScale.bandwidth(),
          height: Math.abs(baseline - top),
        };
      });
      return { x: xScale, y: yScale, bars: computed, legend: [], keys: [] as string[] };
    }

    const multi = data as MultiSeriesDatum[];
    const seriesIds = seriesKeys ?? seriesKeysOf(multi);
    const xScale = bandScale(multi.map((d) => d.label), [plot.x, plot.x + plot.width]);
    const colorByKey = (k: string) => colorAt(seriesIds.indexOf(k));

    let computed: LaidBar[];
    let yScale: ReturnType<typeof linearScale>;

    if (mode === 'stacked') {
      yScale = linearScale([0, stackMax(multi, seriesIds)], [plot.y + plot.height, plot.y]);
      computed = stackLayout(multi, seriesIds)
        .filter((s) => s.value !== 0)
        .map((s) => ({
          id: `${s.label}-${s.key}`,
          color: colorByKey(s.key),
          x: xScale(s.label) ?? plot.x,
          y: yScale(s.end),
          width: xScale.bandwidth(),
          height: yScale(s.start) - yScale(s.end),
        }));
    } else {
      yScale = linearScale([0, groupMax(multi, seriesIds)], [plot.y + plot.height, plot.y]);
      const inner = bandScale(seriesIds, [0, xScale.bandwidth()], 0.1);
      const baseline = yScale(0);
      computed = multi.flatMap((d) =>
        seriesIds.map((key) => {
          const top = yScale(d.values[key] ?? 0);
          return {
            id: `${d.label}-${key}`,
            color: colorByKey(key),
            x: (xScale(d.label) ?? plot.x) + (inner(key) ?? 0),
            y: Math.min(top, baseline),
            width: inner.bandwidth(),
            height: Math.abs(baseline - top),
          };
        }),
      );
    }

    return {
      x: xScale,
      y: yScale,
      bars: computed,
      legend: seriesIds.map((k, i) => ({ label: k, color: colorAt(i) })),
      keys: seriesIds,
    };
  }, [data, mode, seriesKeys, plot.x, plot.y, plot.width, plot.height, yAxis]);

  const table: DataTableModel | undefined = useMemo(() => {
    if (!dataTable) return undefined;
    if (mode === 'single') return datumTable(data as ChartDatum[], title);
    const multi = data as MultiSeriesDatum[];
    return {
      caption: title,
      columns: ['Label', ...keys],
      rows: multi.map((d) => [d.label, ...keys.map((k) => d.values[k] ?? 0)] as (string | number)[]),
    };
  }, [dataTable, mode, data, keys, title]);

  return (
    <Surface
      width={width}
      height={height}
      vibe={vibe}
      title={title}
      description={description}
      ariaLabel={ariaLabel}
      dataTable={table}
      className={className}
      style={style}
      bare={bare}
    >
      {showGrid && <Grid plot={plot} yScale={y} />}
      {bars.map((bar, i) => (
        <BarChartBar key={bar.id} bar={bar} index={i} />
      ))}
      {annotations && <Annotations annotations={annotations} plot={plot} yScale={y} />}
      {showAxes && (
        <>
          <Axis scale={x} orientation="bottom" plot={plot} tickFormat={tickFormatter(xAxis)} ticks={xAxis?.tickCount} />
          <Axis scale={y} orientation="left" plot={plot} tickFormat={tickFormatter(yAxis)} ticks={yAxis?.tickCount} />
        </>
      )}
      {showLegend && legend.length > 0 && <Legend items={legend} x={plot.x + plot.width - 84} y={plot.y} />}
    </Surface>
  );
}

function BarChartBar({ bar, index }: { bar: LaidBar; index: number }) {
  const vibe = useVibeContext();
  // Vary the seed per bar so identical heights still look hand-drawn, not cloned.
  return (
    <RoughRectangle
      x={bar.x}
      y={bar.y}
      width={bar.width}
      height={bar.height}
      fill={bar.color ?? vibe.fill}
      seed={vibe.seed + index}
    />
  );
}
