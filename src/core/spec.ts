import type { EdgeRouting, FlowDirection, FlowEdge, FlowNode } from '../types/charts';
import type { EREntityInput, ERRelationshipInput } from './er';
import type { SequenceActorInput, SequenceMessageInput } from './sequence';
import type { TimelineEventInput, TimelineOrientation } from './timeline';

/**
 * A high-level, serializable description of a diagram. One discriminated union
 * over every diagram type the library renders; `renderDiagram` dispatches each
 * `kind` to its component and `parseMermaid` produces these from text. Keeping
 * the spec here (pure, DOM-free) lets both the parser and the renderer share it.
 */

export type DiagramKind = 'flowchart' | 'sequence' | 'mindmap' | 'arch' | 'er' | 'timeline' | 'org';

export interface FlowchartSpec {
  kind: 'flowchart';
  nodes: FlowNode[];
  edges?: FlowEdge[];
  direction?: FlowDirection;
  routing?: EdgeRouting;
}

export interface SequenceSpec {
  kind: 'sequence';
  actors: SequenceActorInput[];
  messages: SequenceMessageInput[];
}

export interface MindMapSpec {
  kind: 'mindmap';
  nodes: FlowNode[];
  edges?: FlowEdge[];
}

export interface ArchSpec {
  kind: 'arch';
  nodes: FlowNode[];
  edges?: FlowEdge[];
  direction?: FlowDirection;
}

export interface ERSpec {
  kind: 'er';
  entities: EREntityInput[];
  relationships?: ERRelationshipInput[];
  direction?: FlowDirection;
}

export interface TimelineSpec {
  kind: 'timeline';
  events: TimelineEventInput[];
  orientation?: TimelineOrientation;
}

export interface OrgSpec {
  kind: 'org';
  nodes: FlowNode[];
  edges?: FlowEdge[];
  direction?: FlowDirection;
}

export type DiagramSpec =
  | FlowchartSpec
  | SequenceSpec
  | MindMapSpec
  | ArchSpec
  | ERSpec
  | TimelineSpec
  | OrgSpec;
