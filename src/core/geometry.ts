import type { BoundingBox, Margin, PlotArea, Point } from '../types/geometry';

export const DEFAULT_MARGIN: Margin = { top: 24, right: 24, bottom: 32, left: 40 };

export function resolveMargin(margin?: Partial<Margin>): Margin {
  return { ...DEFAULT_MARGIN, ...margin };
}

/** Inner drawing area once margins are removed from the outer surface. */
export function getPlotArea(width: number, height: number, margin?: Partial<Margin>): PlotArea {
  const m = resolveMargin(margin);
  return {
    x: m.left,
    y: m.top,
    width: Math.max(0, width - m.left - m.right),
    height: Math.max(0, height - m.top - m.bottom),
  };
}

/** Axis-aligned bounding box for a set of points. */
export function boundsOf(points: Point[]): BoundingBox {
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const { x, y } of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
