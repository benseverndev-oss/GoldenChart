import { scaleBand, scaleLinear, scalePoint } from 'd3-scale';
import type { ScaleBand, ScaleLinear, ScalePoint } from 'd3-scale';

/**
 * Thin wrappers over d3-scale. Pure math: given a domain and a pixel range they
 * return functions mapping data -> coordinates. No DOM, no rendering.
 */

export function linearScale(domain: [number, number], range: [number, number]): ScaleLinear<number, number> {
  return scaleLinear().domain(domain).range(range);
}

export function bandScale(domain: string[], range: [number, number], padding = 0.2): ScaleBand<string> {
  return scaleBand().domain(domain).range(range).padding(padding);
}

export function pointScale(domain: string[], range: [number, number], padding = 0.5): ScalePoint<string> {
  return scalePoint().domain(domain).range(range).padding(padding);
}

/** Convenience: nice min/max for a numeric series, with optional zero baseline. */
export function extentOf(values: number[], includeZero = true): [number, number] {
  if (values.length === 0) return [0, 1];
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (includeZero) {
    min = Math.min(min, 0);
    max = Math.max(max, 0);
  }
  if (min === max) max = min + 1;
  return [min, max];
}
