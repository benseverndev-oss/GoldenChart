import { useMemo } from 'react';
import type { BaseChartProps } from '../types/charts';
import type { SankeyLinkInput, SankeyNodeInput, SankeyOrientation } from '../core/sankey';
import { computeSankey } from '../core/sankey';
import { getPlotArea } from '../core/geometry';
import { colorAt } from '../core/palette';
import { resolveBrand } from '../brand/resolveBrand';
import { measureText } from '../core/text';
import { resolveVibe } from '../vibe/resolveVibe';
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
  brand,
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
  const horizontal = direction === 'LR';

  // For LR flows the node labels sit to the right of each node; reserve a right
  // margin (sized to the widest label + room for the value) so the last column's
  // labels don't run off the canvas.
  const rv = resolveVibe(vibe);
  const maxLabelW = Math.max(0, ...nodes.map((n) => measureText(n.label ?? n.id, rv.fontSize, rv.fontFamily).width));
  const rightPad = horizontal ? Math.ceil(maxLabelW + (showValues ? 44 : 8) + 6) : 0;
  const layoutWidth = Math.max(1, plot.width - rightPad);

  const layout = useMemo(
    () => computeSankey(nodes, links, [layoutWidth, plot.height], { direction, nodeWidth, nodePadding }),
    [nodes, links, direction, nodeWidth, nodePadding, layoutWidth, plot.height],
  );

  const palette = resolveBrand(brand).palette;
  const colorOf = useMemo(() => {
    const map = new Map<string, string>();
    layout.nodes.forEach((n, i) => map.set(n.id, n.color ?? colorAt(i, palette)));
    return map;
  }, [layout.nodes, palette]);

  return (
    <Surface
      width={width}
      height={height}
      vibe={vibe}
      brand={brand}
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
