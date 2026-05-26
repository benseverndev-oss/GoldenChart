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

/**
 * Closed regular n-gon centered at `(cx, cy)`. The first vertex sits at
 * `rotationRad` (0 = east / 3 o'clock); vertices step clockwise.
 */
export function regularPolygonPath(cx: number, cy: number, r: number, sides: number, rotationRad = 0): string {
  const points = Array.from({ length: sides }, (_, i) =>
    polarToCartesian(cx, cy, r, rotationRad + (i / sides) * 2 * Math.PI),
  );
  return polygonPath(points);
}

/**
 * Closed `points`-pointed star, alternating between `outerR` and `innerR`. The
 * first (outer) vertex sits at `rotationRad` (0 = east); vertices step clockwise.
 */
export function starPath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  points: number,
  rotationRad = 0,
): string {
  const vertices = Array.from({ length: points * 2 }, (_, i) => {
    const radius = i % 2 === 0 ? outerR : innerR;
    return polarToCartesian(cx, cy, radius, rotationRad + (i / (points * 2)) * 2 * Math.PI);
  });
  return polygonPath(vertices);
}

/**
 * Open arc stroke from `startRad` to `endRad` (0 = east, increasing clockwise).
 * No fill — the path is intentionally unclosed.
 */
export function arcStrokePath(cx: number, cy: number, r: number, startRad: number, endRad: number): string {
  const start = polarToCartesian(cx, cy, r, startRad);
  const end = polarToCartesian(cx, cy, r, endRad);
  const largeArc = Math.abs(endRad - startRad) > Math.PI ? 1 : 0;
  const sweep = endRad > startRad ? 1 : 0;
  return `M${start.x},${start.y} A${r},${r} 0 ${largeArc},${sweep} ${end.x},${end.y}`;
}

/**
 * Closed pie wedge from `startRad` to `endRad`. When `innerR` is set, draws an
 * annular wedge (a ring segment) instead of a slice meeting at the center.
 */
export function wedgePath(
  cx: number,
  cy: number,
  r: number,
  startRad: number,
  endRad: number,
  innerR?: number,
): string {
  const largeArc = Math.abs(endRad - startRad) > Math.PI ? 1 : 0;
  const sweep = endRad > startRad ? 1 : 0;
  const oStart = polarToCartesian(cx, cy, r, startRad);
  const oEnd = polarToCartesian(cx, cy, r, endRad);
  if (innerR === undefined || innerR <= 0) {
    return `M${cx},${cy} L${oStart.x},${oStart.y} A${r},${r} 0 ${largeArc},${sweep} ${oEnd.x},${oEnd.y} Z`;
  }
  const iEnd = polarToCartesian(cx, cy, innerR, endRad);
  const iStart = polarToCartesian(cx, cy, innerR, startRad);
  const innerSweep = sweep === 1 ? 0 : 1; // trace the inner arc back the other way
  return (
    `M${oStart.x},${oStart.y} A${r},${r} 0 ${largeArc},${sweep} ${oEnd.x},${oEnd.y} ` +
    `L${iEnd.x},${iEnd.y} A${innerR},${innerR} 0 ${largeArc},${innerSweep} ${iStart.x},${iStart.y} Z`
  );
}
