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

const TWO_PI = 2 * Math.PI;
/** Forward (clockwise) angular span in `[0, 2π)`, robust to wrapped/unordered inputs. */
const forwardSpan = (startRad: number, endRad: number) =>
  (((endRad - startRad) % TWO_PI) + TWO_PI) % TWO_PI;
/** Polygon vertices step from the top (12 o'clock), like `axisAngle`, so rotation 0 points up. */
const TOP = -Math.PI / 2;

/**
 * Closed regular n-gon centered at `(cx, cy)`. The first vertex sits at the top
 * (12 o'clock) when `rotationRad` is 0; `rotationRad` rotates clockwise from there.
 */
export function regularPolygonPath(
  cx: number,
  cy: number,
  r: number,
  sides: number,
  rotationRad = 0,
): string {
  const points = Array.from({ length: sides }, (_, i) =>
    polarToCartesian(cx, cy, r, TOP + rotationRad + (i / sides) * TWO_PI),
  );
  return polygonPath(points);
}

/**
 * Closed `points`-pointed star, alternating between `outerR` and `innerR`. The
 * first (outer) vertex sits at the top when `rotationRad` is 0; clockwise from there.
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
    return polarToCartesian(cx, cy, radius, TOP + rotationRad + (i / (points * 2)) * TWO_PI);
  });
  return polygonPath(vertices);
}

/**
 * Open arc stroke from `startRad` to `endRad` (0 = east). Always drawn in the
 * increasing-angle (clockwise on screen) direction, so wrapped/unordered angles
 * (e.g. 350°→10°) still produce the intended short arc. No fill — unclosed.
 */
export function arcStrokePath(
  cx: number,
  cy: number,
  r: number,
  startRad: number,
  endRad: number,
): string {
  const start = polarToCartesian(cx, cy, r, startRad);
  const end = polarToCartesian(cx, cy, r, endRad);
  const largeArc = forwardSpan(startRad, endRad) > Math.PI ? 1 : 0;
  return `M${start.x},${start.y} A${r},${r} 0 ${largeArc},1 ${end.x},${end.y}`;
}

/**
 * Closed pie wedge from `startRad` to `endRad`, drawn clockwise (robust to
 * wrapped angles). When `innerR` is set, draws an annular wedge (ring segment)
 * instead of a slice meeting at the center.
 */
export function wedgePath(
  cx: number,
  cy: number,
  r: number,
  startRad: number,
  endRad: number,
  innerR?: number,
): string {
  const largeArc = forwardSpan(startRad, endRad) > Math.PI ? 1 : 0;
  const oStart = polarToCartesian(cx, cy, r, startRad);
  const oEnd = polarToCartesian(cx, cy, r, endRad);
  if (innerR === undefined || innerR <= 0) {
    return `M${cx},${cy} L${oStart.x},${oStart.y} A${r},${r} 0 ${largeArc},1 ${oEnd.x},${oEnd.y} Z`;
  }
  const iEnd = polarToCartesian(cx, cy, innerR, endRad);
  const iStart = polarToCartesian(cx, cy, innerR, startRad);
  // Outer arc runs forward (sweep 1); the inner arc traces back the other way (sweep 0).
  return (
    `M${oStart.x},${oStart.y} A${r},${r} 0 ${largeArc},1 ${oEnd.x},${oEnd.y} ` +
    `L${iEnd.x},${iEnd.y} A${innerR},${innerR} 0 ${largeArc},0 ${iStart.x},${iStart.y} Z`
  );
}
