import type { ScaleBand, ScaleLinear, ScalePoint } from 'd3-scale';

export type AnyScale =
  | ScaleLinear<number, number>
  | ScaleBand<string>
  | ScalePoint<string>;

export interface Tick {
  value: string | number;
  /** Pixel position along the scale's range. */
  offset: number;
}

/**
 * Produce tick positions for any supported scale. Pure and DOM-free: callers
 * render the result with `<RoughLine>` / `<RoughText>`.
 *
 * Band scales center their tick on the band; point scales fall out of the same
 * branch because their `bandwidth()` is 0.
 */
export function ticksForScale(scale: AnyScale, count = 5): Tick[] {
  if ('ticks' in scale) {
    const linear = scale as ScaleLinear<number, number>;
    return linear.ticks(count).map((v) => ({ value: v, offset: linear(v) }));
  }

  const banded = scale as ScaleBand<string>;
  const half = banded.bandwidth() / 2;
  return banded.domain().map((v) => ({ value: v, offset: (banded(v) ?? 0) + half }));
}
