import type { FlowDirection } from '../types/charts';
import type { Point } from '../types/geometry';
import { computeGroups, type LayoutEngine } from './diagram';
import { layoutFlow } from './dag';
import { isHorizontal } from './hierarchy';
import type { LaidOutEdge, LaidOutNode } from './hierarchy';
import { boxPort, routeOrthogonal, simplify, type Obstacle } from './routing';

const toBox = (n: LaidOutNode): Obstacle => ({
  x: n.x - n.width / 2,
  y: n.y - n.height / 2,
  width: n.width,
  height: n.height,
});

/** Length of the straight lead-in/out kept perpendicular to each box face. */
const STUB = 14;

/** Outward unit normal of the box side a port sits on. */
function portNormal(box: Obstacle, port: Point): Point {
  if (Math.abs(port.x - box.x) < 0.5) return { x: -1, y: 0 };
  if (Math.abs(port.x - (box.x + box.width)) < 0.5) return { x: 1, y: 0 };
  if (Math.abs(port.y - box.y) < 0.5) return { x: 0, y: -1 };
  return { x: 0, y: 1 };
}

const along = (p: Point, n: Point, d: number): Point => ({ x: p.x + n.x * d, y: p.y + n.y * d });

/**
 * Architecture / network layout: position components with the flow engine, draw
 * a container around each `group`, then route every connector orthogonally
 * around the other boxes (hand-rolled A* router). Ports sit on the box side
 * facing the peer, so links leave and arrive square-on.
 */
export function architectureLayout(direction: FlowDirection = 'TB'): LayoutEngine {
  return (nodes, edges, size) => {
    const base = layoutFlow(nodes, size, edges, direction);
    const byId = new Map(base.nodes.map((n) => [n.id, n]));
    const groups = computeGroups(base.nodes);

    const routed: LaidOutEdge[] = base.edges.flatMap((e) => {
      const s = byId.get(e.from);
      const t = byId.get(e.to);
      if (!s || !t) return [];
      const sBox = toBox(s);
      const tBox = toBox(t);
      const sPort = boxPort(sBox, { x: t.x, y: t.y });
      const tPort = boxPort(tBox, { x: s.x, y: s.y });
      // Route between short stubs set off each face's normal, then re-attach the
      // ports. This forces the connector to leave and arrive perpendicular to the
      // box — so the arrowhead always points squarely into the target rather than
      // grazing along its edge when the route had to approach from the side.
      const sStub = along(sPort, portNormal(sBox, sPort), STUB);
      const tStub = along(tPort, portNormal(tBox, tPort), STUB);
      const obstacles = base.nodes.filter((n) => n.id !== e.from && n.id !== e.to).map(toBox);
      const route = routeOrthogonal(sStub, tStub, obstacles, { padding: 10 });
      const points = simplify([sPort, ...route, tPort]);
      return [{ ...e, sx: sPort.x, sy: sPort.y, tx: tPort.x, ty: tPort.y, points }];
    });

    return {
      nodes: base.nodes,
      edges: routed,
      groups,
      orientation: isHorizontal(direction) ? 'horizontal' : 'vertical',
    };
  };
}
