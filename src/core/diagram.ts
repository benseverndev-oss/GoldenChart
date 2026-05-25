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
