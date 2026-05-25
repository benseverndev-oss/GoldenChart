import { stratify, tree } from 'd3-hierarchy';
import type { HierarchyNode } from 'd3-hierarchy';
import type { FlowEdge, FlowNode } from '../types/charts';

export interface LaidOutNode {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  data: FlowNode;
}

export interface LaidOutEdge {
  from: string;
  to: string;
  label?: string;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
}

export interface FlowLayout {
  nodes: LaidOutNode[];
  edges: LaidOutEdge[];
}

const DEFAULT_NODE_W = 120;
const DEFAULT_NODE_H = 48;

/**
 * Lay out a parent/child node list into a tidy tree using d3-hierarchy. Returns
 * absolute pixel coordinates and edge endpoints — pure math, ready for the
 * rendering layer to draw with `<RoughRectangle>` / `<RoughPath>`.
 */
export function layoutTree(
  nodes: FlowNode[],
  size: [number, number],
  explicitEdges?: FlowEdge[],
): FlowLayout {
  if (nodes.length === 0) return { nodes: [], edges: [] };

  const root: HierarchyNode<FlowNode> = stratify<FlowNode>()
    .id((n) => n.id)
    .parentId((n) => n.parent)(nodes);

  const layout = tree<FlowNode>().size(size).separation((a, b) => (a.parent === b.parent ? 1 : 1.4));
  const positioned = layout(root);

  const byId = new Map<string, LaidOutNode>();
  const laidOutNodes: LaidOutNode[] = positioned.descendants().map((d) => {
    const node: LaidOutNode = {
      id: d.data.id,
      label: d.data.label,
      x: d.x,
      y: d.y,
      width: d.data.width ?? DEFAULT_NODE_W,
      height: d.data.height ?? DEFAULT_NODE_H,
      data: d.data,
    };
    byId.set(node.id, node);
    return node;
  });

  // Prefer explicit edges; otherwise derive them from the parent links.
  const edgeSource: FlowEdge[] = explicitEdges ??
    positioned.links().map((l) => ({ from: l.source.data.id, to: l.target.data.id }));

  const laidOutEdges: LaidOutEdge[] = edgeSource.flatMap((e) => {
    const s = byId.get(e.from);
    const t = byId.get(e.to);
    if (!s || !t) return [];
    return [{
      from: e.from,
      to: e.to,
      label: e.label,
      sx: s.x,
      sy: s.y + s.height / 2,
      tx: t.x,
      ty: t.y - t.height / 2,
    }];
  });

  return { nodes: laidOutNodes, edges: laidOutEdges };
}
