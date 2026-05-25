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

/** SVG path for a straight cubic link between two points (flowchart edges). */
export function linkPath(from: Point, to: Point): string {
  const midY = (from.y + to.y) / 2;
  return `M${from.x},${from.y} C${from.x},${midY} ${to.x},${midY} ${to.x},${to.y}`;
}
