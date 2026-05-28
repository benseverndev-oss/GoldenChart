import type { ChartDatum, MultiSeriesDatum, Series } from '../types/charts';

/**
 * Fallback `<desc>` text generators. Each returns a short sentence summarising
 * the chart's shape so screen-reader users get *something* useful when a
 * consumer doesn't supply an explicit `description`. Kept deterministic and
 * dependency-free; charts call these in the same expression that passes
 * `description` to `<Surface>`.
 */

function isMultiSeries(data: ChartDatum[] | MultiSeriesDatum[]): data is MultiSeriesDatum[] {
  return data.length > 0 && 'values' in (data[0] as object);
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/\.?0+$/, '');
}

function rangeOf(values: number[]): string {
  if (values.length === 0) return '';
  let min = values[0];
  let max = values[0];
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return min === max ? `value ${fmt(min)}` : `values from ${fmt(min)} to ${fmt(max)}`;
}

export function describeBars(data: ChartDatum[] | MultiSeriesDatum[]): string {
  if (data.length === 0) return 'Bar chart with no data.';
  if (isMultiSeries(data)) {
    const seriesKeys = new Set<string>();
    const allValues: number[] = [];
    for (const d of data) {
      for (const k of Object.keys(d.values)) seriesKeys.add(k);
      for (const v of Object.values(d.values)) allValues.push(v);
    }
    return (
      `Bar chart with ${data.length} categor${data.length === 1 ? 'y' : 'ies'} ` +
      `across ${seriesKeys.size} series, ${rangeOf(allValues)}.`
    );
  }
  const single = data as ChartDatum[];
  return (
    `Bar chart with ${single.length} categor${single.length === 1 ? 'y' : 'ies'}, ` +
    `${rangeOf(single.map((d) => d.value))}.`
  );
}

export function describeSeries(series: Series[], kind: 'Line' | 'Area' = 'Line'): string {
  if (series.length === 0) return `${kind} chart with no data.`;
  const total = series.reduce((s, d) => s + d.points.length, 0);
  const ys = series.flatMap((s) => s.points.map((p) => p.y));
  return (
    `${kind} chart with ${series.length} series and ${total} ` +
    `point${total === 1 ? '' : 's'}, y ${rangeOf(ys)}.`
  );
}

export function describePie(data: ChartDatum[]): string {
  if (data.length === 0) return 'Pie chart with no data.';
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    `Pie chart with ${data.length} slice${data.length === 1 ? '' : 's'} ` +
    `totaling ${fmt(total)}.`
  );
}

/** Scatter takes a flat point array (no series wrapper); describes count only. */
export function describeScatter(data: { x: number; y: number }[]): string {
  if (data.length === 0) return 'Scatter plot with no data.';
  return `Scatter plot with ${data.length} point${data.length === 1 ? '' : 's'}.`;
}
