/** Brush range math. Pure: no DOM, no scales. */

/** Linearly invert a pixel position to a domain value (range edges may be reversed). */
export function pixelToValue(px: number, [p0, p1]: [number, number], [v0, v1]: [number, number]): number {
  if (p1 === p0) return v0;
  return v0 + ((px - p0) / (p1 - p0)) * (v1 - v0);
}

export interface PixelMark {
  key: string;
  cx: number;
  cy: number;
}

/**
 * Filter marks whose pixel anchor falls within a brushed range on the given axis.
 * The range is normalized, so a backwards drag still selects correctly.
 */
export function marksInPixelRange<M extends PixelMark>(marks: M[], range: [number, number], axis: 'x' | 'y'): M[] {
  const lo = Math.min(range[0], range[1]);
  const hi = Math.max(range[0], range[1]);
  return marks.filter((m) => {
    const v = axis === 'x' ? m.cx : m.cy;
    return v >= lo && v <= hi;
  });
}
