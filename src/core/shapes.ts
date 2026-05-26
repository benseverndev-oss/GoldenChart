import { area, line, curveBasis, curveCatmullRom, curveLinear, curveMonotoneX } from 'd3-shape';
import type { CurveFactory } from 'd3-shape';
import type { Point } from '../types/geometry';

export type CurveName = 'linear' | 'basis' | 'catmullRom' | 'monotoneX';

const CURVES: Record<CurveName, CurveFactory> = {
  linear: curveLinear,
  basis: curveBasis,
  catmullRom: curveCatmullRom,
  monotoneX: curveMonotoneX,
};

/**
 * Build an SVG path `d` string for a poly-line through points. This string is
 * what gets handed to `<RoughPath>` — D3 computes geometry, never draws it.
 */
export function linePath(points: Point[], curve: CurveName = 'linear'): string {
  const generator = line<Point>()
    .x((p) => p.x)
    .y((p) => p.y)
    .curve(CURVES[curve]);
  return generator(points) ?? '';
}

/** SVG path for a filled area between `points` and a baseline `y0`. */
export function areaPath(points: Point[], y0: number, curve: CurveName = 'linear'): string {
  const generator = area<Point>()
    .x((p) => p.x)
    .y0(y0)
    .y1((p) => p.y)
    .curve(CURVES[curve]);
  return generator(points) ?? '';
}

export type LinkOrientation = 'vertical' | 'horizontal';

/** SVG path for a smooth cubic link between two points (flowchart edges). */
export function linkPath(from: Point, to: Point, orientation: LinkOrientation = 'vertical'): string {
  if (orientation === 'horizontal') {
    const midX = (from.x + to.x) / 2;
    return `M${from.x},${from.y} C${midX},${from.y} ${midX},${to.y} ${to.x},${to.y}`;
  }
  const midY = (from.y + to.y) / 2;
  return `M${from.x},${from.y} C${from.x},${midY} ${to.x},${midY} ${to.x},${to.y}`;
}

/**
 * Vertices of an elbow (orthogonal) connector: it leaves `from` along the flow
 * axis, jogs across at the midpoint, then arrives at `to` along the flow axis.
 * The final segment is axis-aligned, so an arrowhead reads as a clean right
 * angle into the target.
 */
export function orthogonalPoints(from: Point, to: Point, orientation: LinkOrientation = 'vertical'): Point[] {
  if (orientation === 'horizontal') {
    const midX = (from.x + to.x) / 2;
    return [from, { x: midX, y: from.y }, { x: midX, y: to.y }, to];
  }
  const midY = (from.y + to.y) / 2;
  return [from, { x: from.x, y: midY }, { x: to.x, y: midY }, to];
}

/** SVG path for an elbow (orthogonal) connector between two points. */
export function orthogonalPath(from: Point, to: Point, orientation: LinkOrientation = 'vertical'): string {
  const [head, ...rest] = orthogonalPoints(from, to, orientation);
  return `M${head.x},${head.y} ` + rest.map((p) => `L${p.x},${p.y}`).join(' ');
}

/** SVG path for a diamond centered at (cx, cy) — flowchart decision nodes. */
export function diamondPath(cx: number, cy: number, width: number, height: number): string {
  const hw = width / 2;
  const hh = height / 2;
  return `M${cx},${cy - hh} L${cx + hw},${cy} L${cx},${cy + hh} L${cx - hw},${cy} Z`;
}

/** SVG path for an ellipse centered at (cx, cy) — flowchart terminal nodes. */
export function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  return `M${cx - rx},${cy} a${rx},${ry} 0 1,0 ${rx * 2},0 a${rx},${ry} 0 1,0 ${-rx * 2},0 Z`;
}

/**
 * Arrowhead at `to`, pointing along the `from -> to` direction. By default an
 * open two-stroke head (`left -> tip -> right`); when `filled` is true the path
 * is closed into a solid triangle.
 */
export function arrowHeadPath(from: Point, to: Point, size = 9, filled = false): string {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const spread = Math.PI / 7;
  const left = { x: to.x - size * Math.cos(angle - spread), y: to.y - size * Math.sin(angle - spread) };
  const right = { x: to.x - size * Math.cos(angle + spread), y: to.y - size * Math.sin(angle + spread) };
  const d = `M${left.x},${left.y} L${to.x},${to.y} L${right.x},${right.y}`;
  return filled ? `${d} Z` : d;
}
