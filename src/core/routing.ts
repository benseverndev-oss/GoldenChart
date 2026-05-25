import type { Point } from '../types/geometry';

/** An axis-aligned rectangle (top-left origin) the router must steer around. */
export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Midpoint of the box side facing `toward` — a connector's port on that box. */
export function boxPort(box: Obstacle, toward: Point): Point {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const dx = toward.x - cx;
  const dy = toward.y - cy;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return { x: cx + (dx >= 0 ? box.width / 2 : -box.width / 2), y: cy };
  }
  return { x: cx, y: cy + (dy >= 0 ? box.height / 2 : -box.height / 2) };
}

export interface RouteOptions {
  /** Clearance kept between a connector and every obstacle. */
  padding?: number;
  /** Extra cost per 90° turn, biasing the route toward few straight runs. */
  turnPenalty?: number;
}

interface InflatedRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const sortedUnique = (values: number[]): number[] =>
  [...new Set(values.map((v) => Math.round(v * 100) / 100))].sort((a, b) => a - b);

/** True when the axis-aligned segment p→q passes through any rectangle's interior. */
function blocked(p: Point, q: Point, rects: InflatedRect[]): boolean {
  if (p.y === q.y) {
    const y = p.y;
    const x0 = Math.min(p.x, q.x);
    const x1 = Math.max(p.x, q.x);
    return rects.some((r) => y > r.y0 && y < r.y1 && x0 < r.x1 && x1 > r.x0);
  }
  const x = p.x;
  const y0 = Math.min(p.y, q.y);
  const y1 = Math.max(p.y, q.y);
  return rects.some((r) => x > r.x0 && x < r.x1 && y0 < r.y1 && y1 > r.y0);
}

/**
 * Hand-rolled orthogonal connector router. Rather than a uniform pixel grid it
 * builds a sparse lattice from the "interesting" coordinates — every obstacle's
 * padded edges plus the two endpoints — so ports always land on the graph and
 * every lattice segment is axis-aligned. A* then searches that lattice with a
 * per-turn penalty, yielding clean L/Z routes that keep `padding` clearance
 * from other boxes. Pure geometry; returns the simplified polyline from `from`
 * to `to` (or a direct elbow when the lattice is fully blocked).
 */
export function routeOrthogonal(from: Point, to: Point, obstacles: Obstacle[], opts: RouteOptions = {}): Point[] {
  const pad = opts.padding ?? 10;
  const turnPenalty = opts.turnPenalty ?? 20;

  const rects: InflatedRect[] = obstacles.map((o) => ({
    x0: o.x - pad,
    y0: o.y - pad,
    x1: o.x + o.width + pad,
    y1: o.y + o.height + pad,
  }));

  const xs = sortedUnique([from.x, to.x, ...rects.flatMap((r) => [r.x0, r.x1])]);
  const ys = sortedUnique([from.y, to.y, ...rects.flatMap((r) => [r.y0, r.y1])]);
  const xi = new Map(xs.map((v, i) => [v, i]));
  const yi = new Map(ys.map((v, i) => [v, i]));

  const elbow = (): Point[] => {
    const corner = { x: to.x, y: from.y };
    return simplify([from, corner, to]);
  };
  const startX = xi.get(Math.round(from.x * 100) / 100);
  const startY = yi.get(Math.round(from.y * 100) / 100);
  const goalX = xi.get(Math.round(to.x * 100) / 100);
  const goalY = yi.get(Math.round(to.y * 100) / 100);
  if (startX == null || startY == null || goalX == null || goalY == null) return elbow();

  const cols = xs.length;
  const key = (cx: number, cy: number) => cy * cols + cx;
  const pointAt = (cx: number, cy: number): Point => ({ x: xs[cx], y: ys[cy] });

  const start = key(startX, startY);
  const goal = key(goalX, goalY);
  const h = (cx: number, cy: number) => Math.abs(xs[cx] - to.x) + Math.abs(ys[cy] - to.y);

  const gScore = new Map<number, number>([[start, 0]]);
  const cameFrom = new Map<number, number>();
  const open: { k: number; f: number }[] = [{ k: start, f: h(startX, startY) }];

  const colOf = (k: number) => k % cols;
  const rowOf = (k: number) => Math.floor(k / cols);

  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const { k: current } = open.splice(bi, 1)[0];
    if (current === goal) break;

    const ccx = colOf(current);
    const ccy = rowOf(current);
    const prev = cameFrom.get(current);
    const prevDir = prev == null ? null : { dx: ccx - colOf(prev), dy: ccy - rowOf(prev) };

    const neighbours = [
      [ccx + 1, ccy],
      [ccx - 1, ccy],
      [ccx, ccy + 1],
      [ccx, ccy - 1],
    ];
    for (const [ncx, ncy] of neighbours) {
      if (ncx < 0 || ncy < 0 || ncx >= cols || ncy >= ys.length) continue;
      const a = pointAt(ccx, ccy);
      const b = pointAt(ncx, ncy);
      if (blocked(a, b, rects)) continue;
      const step = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
      const dir = { dx: ncx - ccx, dy: ncy - ccy };
      const turn = prevDir && (prevDir.dx !== dir.dx || prevDir.dy !== dir.dy) ? turnPenalty : 0;
      const tentative = gScore.get(current)! + step + turn;
      const nk = key(ncx, ncy);
      if (tentative < (gScore.get(nk) ?? Infinity)) {
        cameFrom.set(nk, current);
        gScore.set(nk, tentative);
        open.push({ k: nk, f: tentative + h(ncx, ncy) });
      }
    }
  }

  if (!cameFrom.has(goal) && start !== goal) return elbow();

  const path: Point[] = [];
  let node: number | undefined = goal;
  while (node != null) {
    path.unshift(pointAt(colOf(node), rowOf(node)));
    node = cameFrom.get(node);
  }
  return simplify(path);
}

/** Drop collinear interior points so the polyline is just its corners. */
function simplify(points: Point[]): Point[] {
  if (points.length <= 2) return points;
  const out: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const a = out[out.length - 1];
    const b = points[i];
    const c = points[i + 1];
    const collinear = (a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y);
    if (!collinear) out.push(b);
  }
  out.push(points[points.length - 1]);
  return out;
}
