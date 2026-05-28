import { useMemo } from 'react';
import type {
  AxisFormat,
  BaseChartProps,
  ChartDatum,
  DataTableModel,
  MultiSeriesDatum,
} from '../types/charts';
import { bandScale, linearScale, extentOf } from '../core/scales';
import { resolveDomain, tickFormatter } from '../core/axisFormat';
import { getPlotArea } from '../core/geometry';
import { colorAt } from '../core/palette';
import { resolveBrand } from '../brand/resolveBrand';
import { datumTable } from '../core/dataTable';
import { describeBars } from '../core/a11yDescribe';
import { groupMax, seriesKeysOf, stackLayout, stackMax } from '../core/stack';
import { Surface } from './Surface';
import { Axis } from './Axis';
import { Grid } from './Grid';
import { Legend } from './Legend';
import { layoutLegend } from '../core/legend';
import type { LegendItem } from '../core/legend';
import { resolveVibe } from '../vibe/resolveVibe';
import { Annotations } from './Annotations';
import type { Annotation } from './Annotations';
import { RoughRectangle } from '../primitives/RoughRectangle';
import { useVibeContext } from '../vibe/VibeProvider';
import { markAttrs } from '../core/interaction';
import { useSeriesVisibility } from './SeriesVisibilityContext';

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
  label: string;
  value: number;
  series?: string;
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
  brand,
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
  const fullPlot = getPlotArea(width, height, margin);
  const resolved = resolveVibe(vibe);
  const palette = resolveBrand(brand).palette;
  const { hidden } = useSeriesVisibility();

  // Legend items depend only on the series, so compute them (and the legend's
  // height) up front and reserve a band at the bottom — the plot shrinks so the
  // legend never overlaps the bars.
  const legendItems = useMemo<LegendItem[]>(() => {
    if (mode === 'single' || !showLegend) return [];
    const ids = seriesKeys ?? seriesKeysOf(data as MultiSeriesDatum[]);
    return ids.map((k, i) => ({ label: k, color: colorAt(i, palette) }));
  }, [mode, showLegend, seriesKeys, data, palette]);
  const legendModel = legendItems.length
    ? layoutLegend(legendItems, fullPlot.width, {
        fontSize: resolved.fontSize,
        fontFamily: resolved.fontFamily,
      })
    : null;
  const plot = legendModel
    ? { ...fullPlot, height: Math.max(1, fullPlot.height - legendModel.height - 36) }
    : fullPlot;

  const { x, y, bars, keys } = useMemo(() => {
    if (mode === 'single') {
      const single = data as ChartDatum[];
      const xScale = bandScale(
        single.map((d) => d.label),
        [plot.x, plot.x + plot.width],
      );
      const values = single.map((d) => d.value);
      const yScale = linearScale(resolveDomain(values, extentOf(values), yAxis), [
        plot.y + plot.height,
        plot.y,
      ]);
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
          label: d.label,
          value: d.value,
        };
      });
      return { x: xScale, y: yScale, bars: computed, keys: [] as string[] };
    }

    const multi = data as MultiSeriesDatum[];
    // Color from the full id list so hiding a series never recolors the others;
    // lay out only the visible ones.
    const allIds = seriesKeys ?? seriesKeysOf(multi);
    const seriesIds = allIds.filter((k) => !hidden.has(k));
    const xScale = bandScale(
      multi.map((d) => d.label),
      [plot.x, plot.x + plot.width],
    );
    const colorByKey = (k: string) => colorAt(allIds.indexOf(k), palette);

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
          label: s.label,
          value: s.value,
          series: s.key,
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
            label: d.label,
            value: d.values[key] ?? 0,
            series: key,
          };
        }),
      );
    }

    return {
      x: xScale,
      y: yScale,
      bars: computed,
      keys: seriesIds,
    };
  }, [data, mode, seriesKeys, plot.x, plot.y, plot.width, plot.height, yAxis, palette, hidden]);

  const table: DataTableModel | undefined = useMemo(() => {
    if (!dataTable) return undefined;
    if (mode === 'single') return datumTable(data as ChartDatum[], title);
    const multi = data as MultiSeriesDatum[];
    return {
      caption: title,
      columns: ['Label', ...keys],
      rows: multi.map(
        (d) => [d.label, ...keys.map((k) => d.values[k] ?? 0)] as (string | number)[],
      ),
    };
  }, [dataTable, mode, data, keys, title]);

  return (
    <Surface
      width={width}
      height={height}
      vibe={vibe}
      brand={brand}
      title={title}
      description={description ?? describeBars(data)}
      ariaLabel={ariaLabel}
      dataTable={table}
      className={className}
      style={style}
      bare={bare}
    >
      {showGrid && <Grid plot={plot} yScale={y} />}
      {bars.map((bar, i) => (
        // Index-suffix the key so degenerate data (duplicate or undefined labels,
        // e.g. from an auto-picked chart) can't collide and trigger React warnings.
        <BarChartBar key={`${bar.id}-${i}`} bar={bar} index={i} />
      ))}
      {annotations && <Annotations annotations={annotations} plot={plot} yScale={y} />}
      {showAxes && (
        <>
          <Axis
            scale={x}
            orientation="bottom"
            plot={plot}
            tickFormat={tickFormatter(xAxis)}
            ticks={xAxis?.tickCount}
          />
          <Axis
            scale={y}
            orientation="left"
            plot={plot}
            tickFormat={tickFormatter(yAxis)}
            ticks={yAxis?.tickCount}
          />
        </>
      )}
      {legendModel && (
        <Legend
          items={legendItems}
          x={fullPlot.x}
          y={plot.y + plot.height + 30}
          width={fullPlot.width}
        />
      )}
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
      dataAttrs={markAttrs({
        kind: 'bar',
        series: bar.series,
        index,
        label: bar.label,
        value: bar.value,
        cx: bar.x + bar.width / 2,
        cy: bar.y,
      })}
    />
  );
}
