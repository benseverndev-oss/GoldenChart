/** Domain math for semantic zoom/pan. Pure: no DOM, no scales. */
export type Domain = [number, number];

/**
 * Zoom around `focus`, a 0..1 fraction of the current domain (0 = low edge,
 * 1 = high edge). `factor < 1` zooms in, `factor > 1` zooms out. The focus point
 * stays stationary in data space.
 */
export function zoomDomain([lo, hi]: Domain, focus: number, factor: number): Domain {
  const anchor = lo + (hi - lo) * focus;
  return [anchor - (anchor - lo) * factor, anchor + (hi - anchor) * factor];
}

/** Shift the whole domain by a data-space delta. */
export function panDomain([lo, hi]: Domain, deltaData: number): Domain {
  return [lo + deltaData, hi + deltaData];
}

/**
 * Clamp a domain inside `bounds`, capping the span to the bounds' span and
 * enforcing `minSpan`, then sliding it back inside if it ran past an edge.
 */
export function clampDomain([lo, hi]: Domain, [bLo, bHi]: Domain, minSpan: number): Domain {
  const span = Math.max(minSpan, Math.min(hi - lo, bHi - bLo));
  const nLo = Math.max(bLo, Math.min(lo, bHi - span));
  return [nLo, nLo + span];
}
