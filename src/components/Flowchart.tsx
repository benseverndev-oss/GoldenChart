import type { BaseChartProps, EdgeRouting, FlowDirection, FlowEdge, FlowNode } from '../types/charts';
import { flowLayout } from '../core/diagram';
import { Diagram } from './Diagram';

export interface FlowchartProps extends BaseChartProps {
  nodes: FlowNode[];
  edges?: FlowEdge[];
  direction?: FlowDirection;
  showArrowheads?: boolean;
  /** Edge connector style. `curved` (default) or `orthogonal` elbow links. */
  routing?: EdgeRouting;
}

/**
 * Flowchart with automatic layout: a tidy d3-hierarchy tree for single-root
 * trees, a layered DAG layout for merges/multiple-roots/cycles (in any of four
 * directions). A thin wrapper over `<Diagram>` with the flow layout engine.
 */
export function Flowchart({
  nodes,
  edges,
  direction = 'TB',
  showArrowheads = true,
  routing = 'curved',
  ...rest
}: FlowchartProps) {
  return (
    <Diagram
      nodes={nodes}
      edges={edges}
      layout={flowLayout(direction)}
      routing={routing}
      showArrowheads={showArrowheads}
      {...rest}
    />
  );
}
