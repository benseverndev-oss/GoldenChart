import { scaleBand, scaleLinear, scalePoint, scaleSqrt } from 'd3-scale';
import type { ScaleBand, ScaleLinear, ScalePoint, ScalePower } from 'd3-scale';

/**
 * Thin wrappers over d3-scale. Pure math: given a domain and a pixel range they
 * return functions mapping data -> coordinates. No DOM, no rendering.
 */

export function linearScale(
  domain: [number, number],
  range: [number, number],
): ScaleLinear<number, number> {
  return scaleLinear().domain(domain).range(range);
}

export function bandScale(
  domain: string[],
  range: [number, number],
  padding = 0.2,
): ScaleBand<string> {
  return scaleBand().domain(domain).range(range).padding(padding);
}

export function pointScale(
  domain: string[],
  range: [number, number],
  padding = 0.5,
): ScalePoint<string> {
  return scalePoint().domain(domain).range(range).padding(padding);
}

/** Square-root scale — the correct mapping for bubble *radii* (area ∝ value). */
export function sqrtScale(
  domain: [number, number],
  range: [number, number],
): ScalePower<number, number> {
  return scaleSqrt().domain(domain).range(range);
}

/** Convenience: nice min/max for a numeric series, with optional zero baseline. */
export function extentOf(values: number[], includeZero = true): [number, number] {
  // Drop NaN/±Infinity so one bad datum can't poison the whole domain (a NaN
  // extent flows into scales and ultimately hangs Rough.js' hachure fill).
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return [0, 1];
  let min = Math.min(...finite);
  let max = Math.max(...finite);
  if (includeZero) {
    min = Math.min(min, 0);
    max = Math.max(max, 0);
  }
  if (min === max) max = min + 1;
  return [min, max];
}
