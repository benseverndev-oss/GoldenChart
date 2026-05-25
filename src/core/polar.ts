import type { Point } from '../types/geometry';

/**
 * Polar coordinate helpers for radial charts (radar, gauge, future arc work).
 * Pure trigonometry — no DOM.
 */

/** Cartesian point at `radius` and `angleRad` from center `(cx, cy)`. */
export function polarToCartesian(cx: number, cy: number, radius: number, angleRad: number): Point {
  return { x: cx + radius * Math.cos(angleRad), y: cy + radius * Math.sin(angleRad) };
}

/** Angle (radians) of axis `index` of `count`, starting at the top, clockwise. */
export function axisAngle(index: number, count: number): number {
  return -Math.PI / 2 + (index / count) * 2 * Math.PI;
}

/** Closed SVG path through a ring of points (e.g. a radar polygon or grid ring). */
export function polygonPath(points: Point[]): string {
  if (points.length === 0) return '';
  return `M${points.map((p) => `${p.x},${p.y}`).join(' L')} Z`;
}
