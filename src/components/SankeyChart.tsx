import { useMemo } from 'react';
import type { BaseChartProps } from '../types/charts';
import type { SankeyLinkInput, SankeyNodeInput, SankeyOrientation } from '../core/sankey';
import { computeSankey } from '../core/sankey';
import { getPlotArea } from '../core/geometry';
import { colorAt } from '../core/palette';
import { Surface } from './Surface';
import { RoughRectangle } from '../primitives/RoughRectangle';
import { RoughPath } from '../primitives/RoughPath';
import { RoughText } from '../primitives/RoughText';

export interface SankeyChartProps extends BaseChartProps {
  nodes: SankeyNodeInput[];
  links: SankeyLinkInput[];
  direction?: SankeyOrientation;
  nodeWidth?: number;
  nodePadding?: number;
  showValues?: boolean;
}

/**
 * Weighted flow diagram. `computeSankey` (built on the DAG layering) sizes nodes
 * by throughput and ribbons by value; `<RoughRectangle>` draws nodes and
 * `<RoughPath>` draws each translucent ribbon.
 */
export function SankeyChart({
  nodes,
  links,
  width,
  height,
  margin,
  vibe,
  title,
  description,
  ariaLabel,
  className,
  style,
  bare,
  direction = 'LR',
  nodeWidth = 16,
  nodePadding = 12,
  showValues = false,
}: SankeyChartProps) {
  const plot = getPlotArea(width, height, margin);

  const layout = useMemo(
    () => computeSankey(nodes, links, [plot.width, plot.height], { direction, nodeWidth, nodePadding }),
    [nodes, links, direction, nodeWidth, nodePadding, plot.width, plot.height],
  );

  const colorOf = useMemo(() => {
    const map = new Map<string, string>();
    layout.nodes.forEach((n, i) => map.set(n.id, n.color ?? colorAt(i)));
    return map;
  }, [layout.nodes]);

  const horizontal = direction === 'LR';

  return (
    <Surface
      width={width}
      height={height}
      vibe={vibe}
      title={title}
      description={description}
      ariaLabel={ariaLabel}
      className={className}
      style={style}
      bare={bare}
    >
      <g transform={`translate(${plot.x}, ${plot.y})`}>
        {layout.links.map((link, i) => (
          <RoughPath
            key={`${link.source}->${link.target}-${i}`}
            d={link.path}
            stroke={colorOf.get(link.source)}
            fill={colorOf.get(link.source)}
            vibe={{ roughness: 0.6, fillStyle: 'solid', disableMultiStroke: true }}
            style={{ opacity: 0.4 }}
            seed={i + 1}
          />
        ))}
        {layout.nodes.map((node, i) => (
          <g key={node.id}>
            <RoughRectangle
              x={node.x}
              y={node.y}
              width={node.width}
              height={node.height}
              fill={colorOf.get(node.id)}
              seed={i + 1}
            />
            <RoughText
              x={horizontal ? node.x + node.width + 4 : node.x + node.width / 2}
              y={horizontal ? node.y + node.height / 2 : node.y + node.height + 4}
              anchor={horizontal ? 'start' : 'middle'}
              baseline={horizontal ? 'middle' : 'hanging'}
            >
              {`${node.label ?? node.id}${showValues ? ` (${node.value})` : ''}`}
            </RoughText>
          </g>
        ))}
      </g>
    </Surface>
  );
}
