import { stratify, tree } from 'd3-hierarchy';
import type { HierarchyNode } from 'd3-hierarchy';
import type { FlowDirection, FlowEdge, FlowNode, FlowNodeShape } from '../types/charts';

export interface LaidOutNode {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: FlowNodeShape;
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

function isHorizontal(direction: FlowDirection): boolean {
  return direction === 'LR' || direction === 'RL';
}

/**
 * Lay out a parent/child node list into a tidy tree using d3-hierarchy, in any
 * of the four cardinal directions. Returns absolute pixel coordinates and edge
 * endpoints — pure math, ready for the rendering layer to draw.
 */
export function layoutTree(
  nodes: FlowNode[],
  size: [number, number],
  explicitEdges?: FlowEdge[],
  direction: FlowDirection = 'TB',
): FlowLayout {
  if (nodes.length === 0) return { nodes: [], edges: [] };

  const [width, height] = size;
  const horizontal = isHorizontal(direction);

  const root: HierarchyNode<FlowNode> = stratify<FlowNode>()
    .id((n) => n.id)
    .parentId((n) => n.parent)(nodes);

  // For horizontal layouts, depth runs along x, so the tree's own size is swapped.
  const layout = tree<FlowNode>()
    .size(horizontal ? [height, width] : [width, height])
    .separation((a, b) => (a.parent === b.parent ? 1 : 1.4));
  const positioned = layout(root);

  const place = (dx: number, dy: number): { x: number; y: number } => {
    switch (direction) {
      case 'BT':
        return { x: dx, y: height - dy };
      case 'LR':
        return { x: dy, y: dx };
      case 'RL':
        return { x: width - dy, y: dx };
      case 'TB':
      default:
        return { x: dx, y: dy };
    }
  };

  const byId = new Map<string, LaidOutNode>();
  const laidOutNodes: LaidOutNode[] = positioned.descendants().map((d) => {
    const { x, y } = place(d.x, d.y);
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

  const edgeSource: FlowEdge[] = explicitEdges ??
    positioned.links().map((l) => ({ from: l.source.data.id, to: l.target.data.id }));

  const laidOutEdges: LaidOutEdge[] = edgeSource.flatMap((e) => {
    const s = byId.get(e.from);
    const t = byId.get(e.to);
    if (!s || !t) return [];

    let sx = s.x;
    let sy = s.y;
    let tx = t.x;
    let ty = t.y;
    switch (direction) {
      case 'TB':
        sy = s.y + s.height / 2;
        ty = t.y - t.height / 2;
        break;
      case 'BT':
        sy = s.y - s.height / 2;
        ty = t.y + t.height / 2;
        break;
      case 'LR':
        sx = s.x + s.width / 2;
        tx = t.x - t.width / 2;
        break;
      case 'RL':
        sx = s.x - s.width / 2;
        tx = t.x + t.width / 2;
        break;
    }

    return [{ from: e.from, to: e.to, label: e.label, sx, sy, tx, ty }];
  });

  return { nodes: laidOutNodes, edges: laidOutEdges };
}
