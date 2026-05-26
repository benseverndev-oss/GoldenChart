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

export type ConnectorRouting = 'straight' | 'curved' | 'orthogonal';

/** Geometry for an arrow connecting two points: shaft `d`, head tails, label spot. */
export interface Connector {
  /** SVG path `d` for the shaft. */
  d: string;
  /** Tail the end head (at `to`) points away from: `arrowHeadPath(endHeadTail, to)`. */
  endHeadTail: Point;
  /** Tail the start head (at `from`) points away from: `arrowHeadPath(startHeadTail, from)`. */
  startHeadTail: Point;
  /** Where a midpoint label sits. */
  labelAt: Point;
}

/**
 * Build the geometry for an arrow connecting `from` to `to`. The shaft is a
 * straight line, a smooth `linkPath` cubic, or an `orthogonalPath` elbow.
 * Orientation defaults to the dominant axis (ties -> horizontal). DOM-free.
 */
export function connectorPath(
  from: Point,
  to: Point,
  opts: { routing?: ConnectorRouting; orientation?: LinkOrientation } = {},
): Connector {
  const routing = opts.routing ?? 'straight';
  const orientation =
    opts.orientation ?? (Math.abs(to.x - from.x) >= Math.abs(to.y - from.y) ? 'horizontal' : 'vertical');
  const midpoint = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };

  if (routing === 'orthogonal') {
    const points = orthogonalPoints(from, to, orientation);
    // Centre the label on the middle (cross) segment rather than on the elbow vertex.
    const a = points[1];
    const b = points[2];
    return {
      d: orthogonalPath(from, to, orientation),
      endHeadTail: points[points.length - 2],
      startHeadTail: points[1],
      labelAt: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    };
  }
  if (routing === 'curved') {
    return { d: linkPath(from, to, orientation), endHeadTail: from, startHeadTail: to, labelAt: midpoint };
  }
  return { d: `M${from.x},${from.y} L${to.x},${to.y}`, endHeadTail: from, startHeadTail: to, labelAt: midpoint };
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
