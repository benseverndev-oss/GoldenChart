import { createElement } from 'react';
import type { ReactElement } from 'react';
import type { BaseChartProps } from '../types/charts';
import type { DiagramSpec } from '../core/spec';
import { Flowchart } from './Flowchart';
import { SequenceDiagram } from './SequenceDiagram';
import { MindMap } from './MindMap';
import { ArchitectureDiagram } from './ArchitectureDiagram';
import { ERDiagram } from './ERDiagram';
import { Timeline } from './Timeline';
import { OrgChart } from './OrgChart';

export type DiagramRenderOptions = Omit<BaseChartProps, 'children'>;

/**
 * Dispatch a {@link DiagramSpec} to its component. The single entry point behind
 * the `render_diagram` tool and the Mermaid bridge: `width`/`height`/`vibe` (and
 * any other base prop) come from `opts`. Mirrors `visualize` for charts.
 */
export function renderDiagram(spec: DiagramSpec, opts: DiagramRenderOptions): ReactElement {
  switch (spec.kind) {
    case 'flowchart':
      return createElement(Flowchart, {
        nodes: spec.nodes,
        edges: spec.edges,
        direction: spec.direction,
        routing: spec.routing,
        ...opts,
      });
    case 'sequence':
      return createElement(SequenceDiagram, {
        actors: spec.actors,
        messages: spec.messages,
        ...opts,
      });
    case 'mindmap':
      return createElement(MindMap, { nodes: spec.nodes, edges: spec.edges, ...opts });
    case 'arch':
      return createElement(ArchitectureDiagram, {
        nodes: spec.nodes,
        edges: spec.edges,
        direction: spec.direction,
        ...opts,
      });
    case 'er':
      return createElement(ERDiagram, {
        entities: spec.entities,
        relationships: spec.relationships,
        direction: spec.direction,
        ...opts,
      });
    case 'timeline':
      return createElement(Timeline, {
        events: spec.events,
        orientation: spec.orientation,
        ...opts,
      });
    case 'org':
      return createElement(OrgChart, {
        nodes: spec.nodes,
        edges: spec.edges,
        direction: spec.direction,
        ...opts,
      });
  }
}
