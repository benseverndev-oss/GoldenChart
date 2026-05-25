import type { FlowDirection, FlowEdge, FlowNode } from '../types/charts';
import { layoutFlow } from './dag';
import type { FlowLayout, LaidOutNode } from './hierarchy';

/**
 * Shared diagram model. A `LayoutEngine` turns nodes + edges into a positioned
 * `DiagramScene`; the `Diagram` component renders any scene. Specific diagram
 * types (flowchart, sequence, mind-map, …) are just a layout engine plus the
 * shared renderer — pure geometry here, no DOM.
 */

export type { LaidOutEdge, LaidOutNode } from './hierarchy';

export type DiagramOrientation = 'vertical' | 'horizontal';

/** A labelled container bounding a set of member nodes. */
export interface LaidGroup {
  id: string;
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DiagramScene extends FlowLayout {
  orientation: DiagramOrientation;
  groups?: LaidGroup[];
}

/** Position a node/edge set within `size`. Bound to its options by a factory. */
export type LayoutEngine = (nodes: FlowNode[], edges: FlowEdge[] | undefined, size: [number, number]) => DiagramScene;

/** The flowchart layout (tidy tree or layered DAG) as a `LayoutEngine`. */
export function flowLayout(direction: FlowDirection = 'TB'): LayoutEngine {
  return (nodes, edges, size) => ({
    ...layoutFlow(nodes, size, edges, direction),
    orientation: direction === 'LR' || direction === 'RL' ? 'horizontal' : 'vertical',
  });
}

/**
 * Tight bounding box of everything a scene draws — node boxes, group containers
 * and edge waypoints — expanded by `pad`. Used to fit the SVG `viewBox` to the
 * content so the diagram scales uniformly into the canvas without clipping,
 * whatever the layout produced.
 */
export function sceneBounds(scene: DiagramScene, pad = 16): { x: number; y: number; width: number; height: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const add = (x: number, y: number): void => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };
  for (const n of scene.nodes) {
    add(n.x - n.width / 2, n.y - n.height / 2);
    add(n.x + n.width / 2, n.y + n.height / 2);
  }
  for (const g of scene.groups ?? []) {
    add(g.x, g.y);
    add(g.x + g.width, g.y + g.height);
  }
  for (const e of scene.edges) {
    add(e.sx, e.sy);
    add(e.tx, e.ty);
    for (const p of e.points ?? []) add(p.x, p.y);
  }
  if (!Number.isFinite(minX)) return { x: 0, y: 0, width: 1, height: 1 };
  return { x: minX - pad, y: minY - pad, width: maxX - minX + 2 * pad, height: maxY - minY + 2 * pad };
}

/**
 * Bounding boxes for node groups, keyed off each node's `group` field. Used by
 * diagram types that draw subgraph/lane containers (e.g. architecture diagrams).
 */
export function computeGroups(nodes: LaidOutNode[], padding = 12): LaidGroup[] {
  const byGroup = new Map<string, LaidOutNode[]>();
  for (const n of nodes) {
    const g = n.data.group;
    if (!g) continue;
    const list = byGroup.get(g);
    if (list) list.push(n);
    else byGroup.set(g, [n]);
  }

  return [...byGroup].map(([id, members]) => {
    const x0 = Math.min(...members.map((m) => m.x - m.width / 2)) - padding;
    const y0 = Math.min(...members.map((m) => m.y - m.height / 2)) - padding;
    const x1 = Math.max(...members.map((m) => m.x + m.width / 2)) + padding;
    const y1 = Math.max(...members.map((m) => m.y + m.height / 2)) + padding;
    return { id, label: id, x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
  });
}
