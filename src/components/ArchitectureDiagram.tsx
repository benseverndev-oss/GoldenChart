import type {
  BaseChartProps,
  FlowDirection,
  FlowEdge,
  FlowNode,
  LayoutOptions,
} from '../types/charts';
import { architectureLayout } from '../core/architecture';
import { Diagram } from './Diagram';

export interface ArchitectureDiagramProps extends BaseChartProps {
  nodes: FlowNode[];
  edges?: FlowEdge[];
  direction?: FlowDirection;
  showArrowheads?: boolean;
  /** Density/spacing/lane-gutter knobs for the swimlane layout. */
  layoutOptions?: LayoutOptions;
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
  layoutOptions,
  ...rest
}: ArchitectureDiagramProps) {
  return (
    <Diagram
      nodes={nodes}
      edges={edges}
      layout={architectureLayout(direction, layoutOptions)}
      showArrowheads={showArrowheads}
      {...rest}
    />
  );
}
