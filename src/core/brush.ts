/** Brush range math. Pure: no DOM, no scales. */

/** Linearly invert a pixel position to a domain value (range edges may be reversed). */
export function pixelToValue(
  px: number,
  [p0, p1]: [number, number],
  [v0, v1]: [number, number],
): number {
  if (p1 === p0) return v0;
  return v0 + ((px - p0) / (p1 - p0)) * (v1 - v0);
}

/** Map a client (screen) coordinate into the chart's viewBox coordinate space. */
export function clientToViewBox(
  client: number,
  rectStart: number,
  rectLength: number,
  vbStart: number,
  vbLength: number,
): number {
  if (rectLength <= 0) return vbStart;
  return vbStart + ((client - rectStart) / rectLength) * vbLength;
}

/** Normalize two endpoints into a rect origin + length (handles backwards drag). */
export function brushRect(a: number, b: number): { start: number; length: number } {
  return { start: Math.min(a, b), length: Math.abs(b - a) };
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
export function marksInPixelRange<M extends PixelMark>(
  marks: M[],
  range: [number, number],
  axis: 'x' | 'y',
): M[] {
  const lo = Math.min(range[0], range[1]);
  const hi = Math.max(range[0], range[1]);
  return marks.filter((m) => {
    const v = axis === 'x' ? m.cx : m.cy;
    return v >= lo && v <= hi;
  });
}
