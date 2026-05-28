import { stratify, tree } from 'd3-hierarchy';
import type { FlowNode } from '../types/charts';
import type { Point } from '../types/geometry';
import type { LayoutEngine } from './diagram';
import { DEFAULT_NODE_H, DEFAULT_NODE_W } from './hierarchy';
import type { LaidOutEdge, LaidOutNode } from './hierarchy';

/**
 * Radial tree layout for mind-maps: the root sits at the plot centre and each
 * generation fans out onto a concentric ring, leaves spread evenly by angle.
 * Edges are straight centre-to-centre spokes (the renderer draws nodes on top,
 * so the overlap is hidden). Pure geometry, returned as a `DiagramScene`.
 */
export function radialLayout(): LayoutEngine {
  return (nodes, edges, size) => {
    const [width, height] = size;
    if (nodes.length === 0) return { nodes: [], edges: [], orientation: 'vertical' };

    // Resolve the tree structure: explicit `parent`, otherwise derived from edges.
    const parentOf = new Map<string, string>();
    for (const e of edges ?? []) parentOf.set(e.to, e.from);
    const withParent = nodes.map((n) =>
      n.parent != null || !parentOf.has(n.id) ? n : { ...n, parent: parentOf.get(n.id) },
    );

    const root = stratify<FlowNode>()
      .id((n) => n.id)
      .parentId((n) => n.parent)(withParent);

    const cx = width / 2;
    const cy = height / 2;

    // Size the radius from the content, not the canvas: each generation needs a
    // ring gap of roughly a node height, and the outer ring's circumference must
    // fit every leaf at its measured width. `Diagram` scales the result to fit.
    const widths = withParent.map((n) => n.width ?? DEFAULT_NODE_W);
    const heights = withParent.map((n) => n.height ?? DEFAULT_NODE_H);
    const maxW = Math.max(DEFAULT_NODE_W / 2, ...widths);
    const maxH = Math.max(DEFAULT_NODE_H / 2, ...heights);
    const depth = Math.max(1, root.height);
    const gap = 28;
    // Generous ring spacing so generations clear each other. The binding
    // dimension near the centre is node *width* (a child can sit beside the
    // root), so factor that in — height alone left the root overlapping its
    // first ring.
    const ringStep = Math.max(maxH * 2.2, maxW * 1.15);
    let radius = depth * ringStep;
    // ...and enough total radius that *every* ring's circumference fits its
    // nodes at the measured width (the inner rings are usually the binding
    // constraint — few nodes, but a small radius).
    const countByDepth = new Map<number, number>();
    for (const d of root.descendants())
      countByDepth.set(d.depth, (countByDepth.get(d.depth) ?? 0) + 1);
    for (const [d, count] of countByDepth) {
      if (d === 0) continue;
      radius = Math.max(radius, (count * (maxW + gap) * depth) / (2 * Math.PI * d));
    }

    const layout = tree<FlowNode>()
      .size([2 * Math.PI, radius])
      .separation((a, b) => (a.parent === b.parent ? 1 : 2) / Math.max(1, a.depth));
    const positioned = layout(root);

    const polar = (angle: number, r: number): Point => ({
      x: cx + r * Math.cos(angle - Math.PI / 2),
      y: cy + r * Math.sin(angle - Math.PI / 2),
    });

    const byId = new Map<string, LaidOutNode>();
    const laidOutNodes: LaidOutNode[] = positioned.descendants().map((d) => {
      const { x, y } = polar(d.x, d.y);
      const node: LaidOutNode = {
        id: d.data.id,
        label: d.data.label,
        x,
        y,
        width: d.data.width ?? DEFAULT_NODE_W,
        height: d.data.height ?? DEFAULT_NODE_H,
        shape: d.data.shape ?? 'rect',
        data: d.data,
      };
      byId.set(node.id, node);
      return node;
    });

    const laidOutEdges: LaidOutEdge[] = positioned.links().flatMap((l) => {
      const s = byId.get(l.source.data.id);
      const t = byId.get(l.target.data.id);
      if (!s || !t) return [];
      const from = { x: s.x, y: s.y };
      const to = { x: t.x, y: t.y };
      return [
        { from: s.id, to: t.id, sx: from.x, sy: from.y, tx: to.x, ty: to.y, points: [from, to] },
      ];
    });

    return { nodes: laidOutNodes, edges: laidOutEdges, orientation: 'vertical' };
  };
}
