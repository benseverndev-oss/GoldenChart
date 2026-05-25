import type { BaseChartProps, FlowEdge, FlowNode } from '../types/charts';
import { radialLayout } from '../core/radial';
import { Diagram } from './Diagram';

export interface MindMapProps extends BaseChartProps {
  nodes: FlowNode[];
  edges?: FlowEdge[];
}

/**
 * Mind-map: a radial tree fanning out from a central root. A thin wrapper over
 * `<Diagram>` with the radial layout engine, straight spokes and no arrowheads.
 */
export function MindMap({ nodes, edges, ...rest }: MindMapProps) {
  return (
    <Diagram nodes={nodes} edges={edges} layout={radialLayout()} showArrowheads={false} {...rest} />
  );
}
