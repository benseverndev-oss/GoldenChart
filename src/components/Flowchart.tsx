import { useMemo } from 'react';
import type { BaseChartProps, FlowDirection, FlowEdge, FlowNode } from '../types/charts';
import { getPlotArea } from '../core/geometry';
import { layoutTree } from '../core/hierarchy';
import type { LaidOutEdge, LaidOutNode } from '../core/hierarchy';
import { arrowHeadPath, diamondPath, ellipsePath, linkPath } from '../core/shapes';
import { Surface } from './Surface';
import { RoughRectangle } from '../primitives/RoughRectangle';
import { RoughPath } from '../primitives/RoughPath';
import { RoughText } from '../primitives/RoughText';

export interface FlowchartProps extends BaseChartProps {
  nodes: FlowNode[];
  edges?: FlowEdge[];
  direction?: FlowDirection;
  showArrowheads?: boolean;
}

/**
 * Tree-layout flowchart. d3-hierarchy positions nodes (in any of four
 * directions), `<RoughPath>` draws edges/arrowheads and the per-shape node
 * outline, `<RoughText>` labels everything. Proof the primitives compose into
 * arbitrary diagrams, not just cartesian charts.
 */
export function Flowchart({
  nodes,
  edges,
  width,
  height,
  margin,
  vibe,
  title,
  className,
  style,
  direction = 'TB',
  showArrowheads = true,
}: FlowchartProps) {
  const plot = getPlotArea(width, height, margin);
  const orientation = direction === 'LR' || direction === 'RL' ? 'horizontal' : 'vertical';

  const layout = useMemo(
    () => layoutTree(nodes, [plot.width, plot.height], edges, direction),
    [nodes, edges, direction, plot.width, plot.height],
  );

  return (
    <Surface width={width} height={height} vibe={vibe} title={title} className={className} style={style}>
      <g transform={`translate(${plot.x}, ${plot.y})`}>
        {layout.edges.map((e) => (
          <FlowchartEdge key={`${e.from}->${e.to}`} edge={e} orientation={orientation} showArrowhead={showArrowheads} />
        ))}
        {layout.nodes.map((n, i) => (
          <FlowchartNode key={n.id} node={n} index={i} />
        ))}
      </g>
    </Surface>
  );
}

function FlowchartEdge({
  edge,
  orientation,
  showArrowhead,
}: {
  edge: LaidOutEdge;
  orientation: 'vertical' | 'horizontal';
  showArrowhead: boolean;
}) {
  const from = { x: edge.sx, y: edge.sy };
  const to = { x: edge.tx, y: edge.ty };
  return (
    <g>
      <RoughPath d={linkPath(from, to, orientation)} fill={null} />
      {showArrowhead && <RoughPath d={arrowHeadPath(from, to)} fill={null} />}
      {edge.label && (
        <RoughText x={(edge.sx + edge.tx) / 2} y={(edge.sy + edge.ty) / 2} anchor="middle" baseline="middle">
          {edge.label}
        </RoughText>
      )}
    </g>
  );
}

function FlowchartNode({ node, index }: { node: LaidOutNode; index: number }) {
  const seed = index + 1;
  const fill = '#ffffff';
  const vibe = node.data.vibe;

  let outline;
  if (node.shape === 'diamond') {
    outline = <RoughPath d={diamondPath(node.x, node.y, node.width, node.height)} fill={fill} vibe={vibe} seed={seed} />;
  } else if (node.shape === 'ellipse') {
    outline = (
      <RoughPath d={ellipsePath(node.x, node.y, node.width / 2, node.height / 2)} fill={fill} vibe={vibe} seed={seed} />
    );
  } else {
    outline = (
      <RoughRectangle
        x={node.x - node.width / 2}
        y={node.y - node.height / 2}
        width={node.width}
        height={node.height}
        fill={fill}
        vibe={vibe}
        seed={seed}
      />
    );
  }

  return (
    <g>
      {outline}
      <RoughText x={node.x} y={node.y} anchor="middle" baseline="middle" vibe={vibe}>
        {node.label}
      </RoughText>
    </g>
  );
}
