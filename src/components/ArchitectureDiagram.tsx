import type { BaseChartProps, FlowDirection, FlowEdge, FlowNode } from '../types/charts';
import { architectureLayout } from '../core/architecture';
import { Diagram } from './Diagram';

export interface ArchitectureDiagramProps extends BaseChartProps {
  nodes: FlowNode[];
  edges?: FlowEdge[];
  direction?: FlowDirection;
  showArrowheads?: boolean;
}

/**
 * Architecture / network diagram: components (optionally grouped into zone
 * containers via each node's `group`) joined by connectors that route
 * orthogonally around the other boxes. A thin wrapper over `<Diagram>` with the
 * architecture layout engine, which supplies the routed edge waypoints.
 */
export function ArchitectureDiagram({
  nodes,
  edges,
  direction = 'TB',
  showArrowheads = true,
  ...rest
}: ArchitectureDiagramProps) {
  return (
    <Diagram
      nodes={nodes}
      edges={edges}
      layout={architectureLayout(direction)}
      showArrowheads={showArrowheads}
      {...rest}
    />
  );
}
