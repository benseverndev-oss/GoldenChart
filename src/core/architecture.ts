import type { FlowDirection } from '../types/charts';
import { computeGroups, type LayoutEngine } from './diagram';
import { layoutFlow } from './dag';
import { isHorizontal } from './hierarchy';
import type { LaidOutEdge, LaidOutNode } from './hierarchy';
import { boxPort, routeOrthogonal, type Obstacle } from './routing';

const toBox = (n: LaidOutNode): Obstacle => ({
  x: n.x - n.width / 2,
  y: n.y - n.height / 2,
  width: n.width,
  height: n.height,
});

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
      const obstacles = base.nodes.filter((n) => n.id !== e.from && n.id !== e.to).map(toBox);
      const points = routeOrthogonal(sPort, tPort, obstacles, { padding: 10 });
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
