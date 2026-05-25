import type { BaseChartProps, FlowDirection, FlowEdge, FlowNode } from '../types/charts';
import { flowLayout } from '../core/diagram';
import { Diagram } from './Diagram';

export interface OrgChartProps extends BaseChartProps {
  nodes: FlowNode[];
  edges?: FlowEdge[];
  direction?: FlowDirection;
}

/**
 * Organisation chart: a tidy hierarchy of rectangular boxes joined by plain
 * elbow connectors (no arrowheads). A thin wrapper over `<Diagram>` with the
 * flow layout engine, forcing rectangular nodes regardless of any shape hint.
 */
export function OrgChart({ nodes, edges, direction = 'TB', ...rest }: OrgChartProps) {
  const boxes = nodes.map((n) => (n.shape === 'rect' ? n : { ...n, shape: 'rect' as const }));
  return (
    <Diagram
      nodes={boxes}
      edges={edges}
      layout={flowLayout(direction)}
      routing="orthogonal"
      showArrowheads={false}
      {...rest}
    />
  );
}
