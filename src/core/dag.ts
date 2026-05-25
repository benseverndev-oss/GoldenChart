import type { FlowDirection, FlowEdge, FlowNode } from '../types/charts';
import {
  DEFAULT_NODE_H,
  DEFAULT_NODE_W,
  connectEdge,
  isHorizontal,
  layoutTree,
} from './hierarchy';
import type { FlowLayout, LaidOutEdge, LaidOutNode } from './hierarchy';

/** Edges as given, or derived from each node's `parent` link when absent. */
function effectiveEdges(nodes: FlowNode[], explicit?: FlowEdge[]): FlowEdge[] {
  if (explicit && explicit.length > 0) return explicit;
  return nodes.filter((n) => n.parent != null).map((n) => ({ from: n.parent as string, to: n.id }));
}

/**
 * A graph is "tree-like" — and therefore better served by the tidy d3 tree
 * layout — when it has exactly one root, no node with more than one parent, and
 * no cycles. Everything else (merges, multiple roots, cycles) needs the layered
 * DAG layout.
 */
function isTreeLike(nodes: FlowNode[], edges: FlowEdge[]): boolean {
  const ids = new Set(nodes.map((n) => n.id));
  const indeg = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  for (const e of edges) {
    if (!ids.has(e.from) || !ids.has(e.to) || e.from === e.to) return false;
    const next = (indeg.get(e.to) ?? 0) + 1;
    if (next > 1) return false;
    indeg.set(e.to, next);
  }
  const roots = nodes.filter((n) => (indeg.get(n.id) ?? 0) === 0);
  if (roots.length !== 1) return false;

  // Acyclic check: every node is reachable from the single root in exactly one
  // path (guaranteed acyclic + connected given the indegree constraints above).
  const children = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  for (const e of edges) children.get(e.from)!.push(e.to);
  const seen = new Set<string>();
  const stack = [roots[0].id];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) return false; // revisit ⇒ cycle reachable from root
    seen.add(id);
    for (const c of children.get(id)!) stack.push(c);
  }
  return seen.size === nodes.length;
}

/**
 * Lay out a general directed graph using a layered (Sugiyama-style) approach:
 * longest-path layering, a median heuristic to reduce edge crossings, then even
 * spacing within each layer. Handles merges (multiple parents), multiple roots
 * and cycles (degenerate, but won't loop). Pure math — pixel coordinates ready
 * for the renderer, mirroring `layoutTree`'s output shape.
 */
export function layoutDag(
  nodes: FlowNode[],
  size: [number, number],
  edges: FlowEdge[],
  direction: FlowDirection = 'TB',
): FlowLayout {
  if (nodes.length === 0) return { nodes: [], edges: [] };

  const [width, height] = size;
  const horizontal = isHorizontal(direction);
  const ids = new Set(nodes.map((n) => n.id));
  const links = edges.filter((e) => ids.has(e.from) && ids.has(e.to) && e.from !== e.to);

  const children = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  const parents = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  for (const e of links) {
    children.get(e.from)!.push(e.to);
    parents.get(e.to)!.push(e.from);
  }

  // Longest-path layering via bounded relaxation: roots stay at layer 0, every
  // other node sits one below its deepest parent. The iteration cap guarantees
  // termination even if the input contains a cycle.
  const layer = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  for (let iter = 0; iter < nodes.length; iter++) {
    let changed = false;
    for (const e of links) {
      const want = layer.get(e.from)! + 1;
      if (want > layer.get(e.to)!) {
        layer.set(e.to, want);
        changed = true;
      }
    }
    if (!changed) break;
  }

  const maxLayer = Math.max(...nodes.map((n) => layer.get(n.id)!));
  const byLayer: string[][] = Array.from({ length: maxLayer + 1 }, () => []);
  for (const n of nodes) byLayer[layer.get(n.id)!].push(n.id);

  // Crossing reduction: alternate down/up median sweeps. A node moves to the
  // median position of its already-ordered neighbours in the adjacent layer.
  const pos = new Map<string, number>();
  const reindex = (ord: string[]) => ord.forEach((id, i) => pos.set(id, i));
  byLayer.forEach(reindex);

  const median = (id: string, neighbours: Map<string, string[]>): number => {
    const ps = neighbours.get(id)!.map((nb) => pos.get(nb)!).filter((p) => p != null);
    if (ps.length === 0) return pos.get(id)!; // no anchor ⇒ keep current slot
    ps.sort((a, b) => a - b);
    const mid = Math.floor(ps.length / 2);
    return ps.length % 2 ? ps[mid] : (ps[mid - 1] + ps[mid]) / 2;
  };

  const sweep = (neighbours: Map<string, string[]>, order: number[]) => {
    for (const l of order) {
      const keyed = byLayer[l].map((id, i) => ({ id, key: median(id, neighbours), i }));
      keyed.sort((a, b) => a.key - b.key || a.i - b.i);
      byLayer[l] = keyed.map((k) => k.id);
      reindex(byLayer[l]);
    }
  };

  const down = Array.from({ length: maxLayer }, (_, i) => i + 1); // layers 1..max
  const up = down.slice().reverse().map((l) => l - 1); // layers max-1..0
  for (let i = 0; i < 2; i++) {
    sweep(parents, down);
    sweep(children, up);
  }

  // Coordinate assignment: layer index drives the flow (depth) axis, slot index
  // spreads nodes evenly across the cross (breadth) axis.
  const depthFrac = (l: number) => (maxLayer === 0 ? 0.5 : l / maxLayer);
  const byId = new Map<string, LaidOutNode>();
  const laidOutNodes: LaidOutNode[] = nodes.map((n) => {
    const l = layer.get(n.id)!;
    const slots = byLayer[l];
    const breadthFrac = (slots.indexOf(n.id) + 1) / (slots.length + 1);
    const depthPx = (horizontal ? width : height) * depthFrac(l);
    const breadthPx = (horizontal ? height : width) * breadthFrac;

    let x: number;
    let y: number;
    switch (direction) {
      case 'BT':
        x = breadthPx;
        y = height - depthPx;
        break;
      case 'LR':
        x = depthPx;
        y = breadthPx;
        break;
      case 'RL':
        x = width - depthPx;
        y = breadthPx;
        break;
      case 'TB':
      default:
        x = breadthPx;
        y = depthPx;
        break;
    }

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
    byId.set(node.id, node);
    return node;
  });

  const laidOutEdges: LaidOutEdge[] = links.flatMap((e) => {
    const s = byId.get(e.from);
    const t = byId.get(e.to);
    if (!s || !t) return [];
    return [{ from: e.from, to: e.to, label: e.label, ...connectEdge(s, t, direction) }];
  });

  return { nodes: laidOutNodes, edges: laidOutEdges };
}

/**
 * Lay out a flowchart, automatically choosing the engine: the tidy d3 tree
 * layout for single-root trees, the layered DAG layout for everything else
 * (merges, multiple roots, cycles). Keeps the common tree case unchanged while
 * supporting arbitrary directed graphs.
 */
export function layoutFlow(
  nodes: FlowNode[],
  size: [number, number],
  edges?: FlowEdge[],
  direction: FlowDirection = 'TB',
): FlowLayout {
  if (nodes.length === 0) return { nodes: [], edges: [] };

  const eff = effectiveEdges(nodes, edges);
  if (isTreeLike(nodes, eff)) {
    // Ensure `parent` is set so d3 `stratify` can build the hierarchy even when
    // the structure was supplied purely as explicit edges.
    const parentOf = new Map<string, string>(eff.map((e) => [e.to, e.from]));
    const augmented = nodes.map((n) =>
      n.parent != null || !parentOf.has(n.id) ? n : { ...n, parent: parentOf.get(n.id) },
    );
    return layoutTree(augmented, size, edges, direction);
  }

  return layoutDag(nodes, size, eff, direction);
}
