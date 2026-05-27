/** Interpolation helpers for animated data transitions. Pure: no DOM, no rAF. */

/** Linear blend between `a` and `b` at fraction `t` (0..1). */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Blend two numeric maps key-by-key. Keys missing from `from` snap to the `to`
 * value (an entering mark has no prior position to ease from).
 */
export function interpolateNumberMap(
  from: Record<string, number>,
  to: Record<string, number>,
  t: number,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of Object.keys(to)) {
    out[k] = k in from ? lerp(from[k], to[k], t) : to[k];
  }
  return out;
}

/** Standard ease-in-out cubic; pins 0->0 and 1->1. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
