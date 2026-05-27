export interface Point {
  x: number;
  y: number;
}
export interface Size {
  width: number;
  height: number;
}

/** Position a tooltip box near `anchor`, offset by `gap`, flipping at the right/
 *  bottom edges of `bounds` and clamping so it never leaves the near edges. */
export function placeTooltip(anchor: Point, size: Size, bounds: Size, gap = 8): Point {
  let x = anchor.x + gap;
  let y = anchor.y + gap;
  if (x + size.width > bounds.width) x = anchor.x - gap - size.width;
  if (y + size.height > bounds.height) y = anchor.y - gap - size.height;
  return { x: Math.max(0, x), y: Math.max(0, y) };
}
