import { stratify, tree } from 'd3-hierarchy';
import type { HierarchyNode } from 'd3-hierarchy';
import type { FlowDirection, FlowEdge, FlowNode, FlowNodeShape } from '../types/charts';
import type { Point } from '../types/geometry';

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
  /**
   * Explicit waypoints for the connector, source boundary → target boundary
   * (e.g. obstacle-routed architecture edges or straight mind-map spokes). When
   * present the renderer draws this polyline instead of deriving a curve/elbow.
   */
  points?: Point[];
}

export interface FlowLayout {
  nodes: LaidOutNode[];
  edges: LaidOutEdge[];
}

export const DEFAULT_NODE_W = 120;
export const DEFAULT_NODE_H = 48;

export function isHorizontal(direction: FlowDirection): boolean {
  return direction === 'LR' || direction === 'RL';
}

/**
 * Offset an edge's endpoints from node centers to the node boundaries facing
 * the flow direction, so links start/end at an edge rather than the middle.
 * Shared by the tree and DAG layout engines.
 */
export function connectEdge(
  s: LaidOutNode,
  t: LaidOutNode,
  direction: FlowDirection,
): { sx: number; sy: number; tx: number; ty: number } {
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
  return { sx, sy, tx, ty };
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

  // Size the axes by node extent rather than forcing the data into the canvas:
  // the breadth axis gives every sibling a slot at least its own size + a gap
  // (so boxes never abut), and the depth axis spaces the generations. The
  // Diagram then fits this (possibly larger) extent into the canvas.
  const maxW = Math.max(DEFAULT_NODE_W, ...nodes.map((n) => n.width ?? DEFAULT_NODE_W));
  const maxH = Math.max(DEFAULT_NODE_H, ...nodes.map((n) => n.height ?? DEFAULT_NODE_H));
  const SIBLING_GAP = 28;
  const LAYER_GAP = 44;
  const breadthNode = horizontal ? maxH : maxW;
  const depthNode = horizontal ? maxW : maxH;
  const breadthExtent = Math.max(horizontal ? height : width, root.leaves().length * (breadthNode + SIBLING_GAP));
  const depthExtent = Math.max(horizontal ? width : height, Math.max(1, root.height) * (depthNode + LAYER_GAP));

  // d3's first coord is the breadth (across siblings), the second is the depth.
  const layout = tree<FlowNode>()
    .size([breadthExtent, depthExtent])
    .separation((a, b) => (a.parent === b.parent ? 1 : 1.4));
  const positioned = layout(root);

  const place = (breadthPos: number, depthPos: number): { x: number; y: number } => {
    switch (direction) {
      case 'BT':
        return { x: breadthPos, y: depthExtent - depthPos };
      case 'LR':
        return { x: depthPos, y: breadthPos };
      case 'RL':
        return { x: depthExtent - depthPos, y: breadthPos };
      case 'TB':
      default:
        return { x: breadthPos, y: depthPos };
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
    return [{ from: e.from, to: e.to, label: e.label, ...connectEdge(s, t, direction) }];
  });

  return { nodes: laidOutNodes, edges: laidOutEdges };
}
