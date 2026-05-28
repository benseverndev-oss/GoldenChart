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

/** One wheel notch -> zoom factor. Scroll up (deltaY < 0) zooms in; reciprocals
 *  so a zoom-in then zoom-out returns to the original domain. */
export function wheelFactor(deltaY: number): number {
  return deltaY < 0 ? 0.8 : 1.25;
}

/** Apply a wheel event to a domain: zoom around `focus` (0..1) then clamp. */
export function wheelZoom(
  domain: Domain,
  focus: number,
  deltaY: number,
  bounds: Domain,
  minSpan: number,
): Domain {
  return clampDomain(zoomDomain(domain, focus, wheelFactor(deltaY)), bounds, minSpan);
}

/** Pointer position -> 0..1 fraction across an element, clamped to the edges. */
export function focusFraction(clientPos: number, edgeStart: number, length: number): number {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(1, (clientPos - edgeStart) / length));
}
