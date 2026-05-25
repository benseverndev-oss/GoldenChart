import type { FlowNode } from '../types/charts';
import type { Point } from '../types/geometry';
import type { LayoutEngine } from './diagram';
import { DEFAULT_NODE_H, DEFAULT_NODE_W } from './hierarchy';
import type { LaidOutEdge, LaidOutNode } from './hierarchy';

/** Distance from a rect's centre to its boundary along the unit vector (ux, uy). */
function boundaryDist(halfW: number, halfH: number, ux: number, uy: number): number {
  const tx = ux === 0 ? Infinity : halfW / Math.abs(ux);
  const ty = uy === 0 ? Infinity : halfH / Math.abs(uy);
  return Math.min(tx, ty);
}

/**
 * Radial mind-map layout: the root sits at the centre and each generation fans
 * out onto a concentric ring. A node's children occupy an angular wedge sized by
 * their leaf count, and the root's children spread around the full circle — so
 * the tree fills the canvas instead of collapsing into a one-sided fan. Spokes
 * are trimmed to the node boundaries (no fill masking needed). Pure geometry.
 */
export function radialLayout(): LayoutEngine {
  return (nodes, edges, size) => {
    const [width, height] = size;
    if (nodes.length === 0) return { nodes: [], edges: [], orientation: 'vertical' };

    const parentOf = new Map<string, string>();
    for (const e of edges ?? []) parentOf.set(e.to, e.from);
    const getParent = (n: FlowNode): string | undefined => n.parent ?? parentOf.get(n.id);

    const children = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
    let rootId = nodes[0].id;
    for (const n of nodes) {
      const p = getParent(n);
      if (p != null && children.has(p)) children.get(p)!.push(n.id);
      else rootId = n.id;
    }

    const leafCount = new Map<string, number>();
    const countLeaves = (id: string): number => {
      const kids = children.get(id)!;
      const c = kids.length === 0 ? 1 : kids.reduce((s, k) => s + countLeaves(k), 0);
      leafCount.set(id, c);
      return c;
    };
    countLeaves(rootId);

    const depthOf = new Map<string, number>();
    const angleOf = new Map<string, number>();
    const assign = (id: string, depth: number, a0: number, a1: number): void => {
      depthOf.set(id, depth);
      angleOf.set(id, (a0 + a1) / 2);
      const kids = children.get(id)!;
      if (kids.length === 0) return;
      const total = kids.reduce((s, k) => s + leafCount.get(k)!, 0);
      let cursor = a0;
      for (const k of kids) {
        const span = (a1 - a0) * (leafCount.get(k)! / total);
        assign(k, depth + 1, cursor, cursor + span);
        cursor += span;
      }
    };
    assign(rootId, 0, 0, Math.PI * 2);

    const maxDepth = Math.max(0, ...depthOf.values());
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.max(1, Math.min(width, height) / 2 - Math.max(DEFAULT_NODE_W, DEFAULT_NODE_H) / 2);
    const ringStep = maxDepth === 0 ? 0 : radius / maxDepth;

    const polar = (angle: number, r: number): Point => ({
      x: cx + r * Math.cos(angle - Math.PI / 2),
      y: cy + r * Math.sin(angle - Math.PI / 2),
    });

    const byId = new Map<string, LaidOutNode>();
    const laidOutNodes: LaidOutNode[] = nodes.map((n) => {
      const { x, y } = polar(angleOf.get(n.id) ?? 0, (depthOf.get(n.id) ?? 0) * ringStep);
      const node: LaidOutNode = {
        id: n.id,
        label: n.label,
        x,
        y,
        width: n.width ?? DEFAULT_NODE_W,
        height: n.height ?? DEFAULT_NODE_H,
        shape: n.shape ?? 'rect',
        data: n,
      };
      byId.set(n.id, node);
      return node;
    });

    const laidOutEdges: LaidOutEdge[] = [];
    for (const n of nodes) {
      const p = getParent(n);
      const s = p != null ? byId.get(p) : undefined;
      const t = byId.get(n.id)!;
      if (!s) continue;
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const from = { x: s.x + ux * boundaryDist(s.width / 2, s.height / 2, ux, uy), y: s.y + uy * boundaryDist(s.width / 2, s.height / 2, ux, uy) };
      const to = { x: t.x - ux * boundaryDist(t.width / 2, t.height / 2, ux, uy), y: t.y - uy * boundaryDist(t.width / 2, t.height / 2, ux, uy) };
      laidOutEdges.push({ from: s.id, to: t.id, sx: from.x, sy: from.y, tx: to.x, ty: to.y, points: [from, to] });
    }

    return { nodes: laidOutNodes, edges: laidOutEdges, orientation: 'vertical' };
  };
}
