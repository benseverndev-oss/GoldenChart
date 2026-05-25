import type { MultiSeriesDatum } from '../types/charts';

/**
 * Pure helpers for grouped/stacked multi-series bar layouts. Geometry only —
 * the component turns these data-space spans into pixels via the scales.
 */

/** Series keys in first-seen order across the data. */
export function seriesKeysOf(data: MultiSeriesDatum[]): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const d of data) {
    for (const k of Object.keys(d.values)) {
      if (!seen.has(k)) {
        seen.add(k);
        keys.push(k);
      }
    }
  }
  return keys;
}

export interface StackSegment {
  label: string;
  key: string;
  start: number;
  end: number;
  value: number;
}

/** Cumulative [start,end] spans per category, stacked in `keys` order. */
export function stackLayout(data: MultiSeriesDatum[], keys: string[]): StackSegment[] {
  const segments: StackSegment[] = [];
  for (const d of data) {
    let cursor = 0;
    for (const key of keys) {
      const value = d.values[key] ?? 0;
      segments.push({ label: d.label, key, start: cursor, end: cursor + value, value });
      cursor += value;
    }
  }
  return segments;
}

/** Largest stacked total across categories (the stacked y-domain max). */
export function stackMax(data: MultiSeriesDatum[], keys: string[]): number {
  return Math.max(0, ...data.map((d) => keys.reduce((sum, k) => sum + (d.values[k] ?? 0), 0)));
}

/** Largest single value across categories (the grouped y-domain max). */
export function groupMax(data: MultiSeriesDatum[], keys: string[]): number {
  return Math.max(0, ...data.flatMap((d) => keys.map((k) => d.values[k] ?? 0)));
}
