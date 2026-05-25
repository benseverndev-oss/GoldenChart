import { useMemo } from 'react';
import type { BaseChartProps, FlowEdge, FlowNode } from '../types/charts';
import { getPlotArea } from '../core/geometry';
import { layoutTree } from '../core/hierarchy';
import { linkPath } from '../core/shapes';
import { Surface } from './Surface';
import { RoughRectangle } from '../primitives/RoughRectangle';
import { RoughPath } from '../primitives/RoughPath';
import { useVibeContext } from '../vibe/VibeProvider';

export interface FlowchartProps extends BaseChartProps {
  nodes: FlowNode[];
  edges?: FlowEdge[];
}

/**
 * Tree-layout flowchart: d3-hierarchy positions the nodes, `<RoughPath>` draws
 * the edges and `<RoughRectangle>` the boxes. Proof that the primitives compose
 * into arbitrary diagrams, not just cartesian charts.
 */
export function Flowchart({ nodes, edges, width, height, margin, vibe, title, className, style }: FlowchartProps) {
  const plot = getPlotArea(width, height, margin);

  const layout = useMemo(
    () => layoutTree(nodes, [plot.width, plot.height], edges),
    [nodes, edges, plot.width, plot.height],
  );

  return (
    <Surface width={width} height={height} vibe={vibe} title={title} className={className} style={style}>
      <g transform={`translate(${plot.x}, ${plot.y})`}>
        {layout.edges.map((e) => (
          <RoughPath
            key={`${e.from}->${e.to}`}
            d={linkPath({ x: e.sx, y: e.sy }, { x: e.tx, y: e.ty })}
            fill={null}
          />
        ))}
        {layout.nodes.map((n, i) => (
          <FlowchartNode key={n.id} node={n} index={i} />
        ))}
      </g>
    </Surface>
  );
}

function FlowchartNode({
  node,
  index,
}: {
  node: { id: string; label: string; x: number; y: number; width: number; height: number };
  index: number;
}) {
  const vibe = useVibeContext();
  return (
    <g>
      <RoughRectangle
        x={node.x - node.width / 2}
        y={node.y - node.height / 2}
        width={node.width}
        height={node.height}
        fill="#ffffff"
        seed={vibe.seed + index}
      />
      <text
        x={node.x}
        y={node.y}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily={vibe.fontFamily}
        fontSize={vibe.fontSize}
        fill={vibe.stroke}
      >
        {node.label}
      </text>
    </g>
  );
}
