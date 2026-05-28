import type { AxisFormat } from '../types/charts';
import { linearScale } from './scales';
import { formatValue } from './format';

/**
 * Resolve an `AxisFormat.domain` against a chart's values. Returns the default
 * extent when no override is given, so callers stay default-preserving.
 */
export function resolveDomain(
  values: number[],
  fallback: [number, number],
  axis?: AxisFormat,
): [number, number] {
  const d = axis?.domain;
  if (Array.isArray(d)) return d;
  if (d === 'zero') {
    const lo = Math.min(0, ...values);
    const hi = Math.max(0, ...values);
    return [lo, hi === lo ? lo + 1 : hi];
  }
  if (d === 'nice') {
    return linearScale(fallback, [0, 1]).nice().domain() as [number, number];
  }
  return fallback;
}

/** A tick formatter for an axis, or `undefined` to keep the chart default. */
export function tickFormatter(axis?: AxisFormat): ((v: string | number) => string) | undefined {
  if (!axis || (axis.format == null && axis.unit == null)) return undefined;
  return (v) => formatValue(v, axis.format, axis.unit);
}
