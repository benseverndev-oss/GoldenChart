import { useMemo } from 'react';
import type { BaseChartProps } from '../types/charts';
import type { TreemapDatum, TreemapTile } from '../core/treemap';
import { computeTreemap } from '../core/treemap';
import { getPlotArea } from '../core/geometry';
import { ordinalColor } from '../core/colorScales';
import { resolveVibe } from '../vibe/resolveVibe';
import { Surface } from './Surface';
import { RoughRectangle } from '../primitives/RoughRectangle';
import { RoughText } from '../primitives/RoughText';

export interface TreemapChartProps extends BaseChartProps {
  data: TreemapDatum[];
  padding?: number;
  tile?: TreemapTile;
  showLabels?: boolean;
}

const MIN_LABEL_W = 28;
const MIN_LABEL_H = 18;

/**
 * Space-filling nested rectangles sized by value. `computeTreemap` (d3-hierarchy)
 * does the math; one `<RoughRectangle>` per leaf, colored by its top-level group.
 */
export function TreemapChart({
  data,
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
  padding = 2,
  tile = 'squarify',
  showLabels = true,
}: TreemapChartProps) {
  const plot = getPlotArea(width, height, margin);

  const leaves = useMemo(
    () => computeTreemap(data, [plot.width, plot.height], { padding, tile }),
    [data, padding, tile, plot.width, plot.height],
  );

  const colorOf = useMemo(() => ordinalColor(leaves.map((l) => l.groupId)), [leaves]);

  // Airier hachure so the cell labels read clearly over the fill (the default
  // dense fill competes with the text). Spread the resolved vibe so the theme is
  // preserved — a bare override object would reset to the default preset.
  const rv = resolveVibe(vibe);
  const cellVibe = { ...rv, hachureGap: Math.max(rv.hachureGap, 7), fillWeight: Math.min(rv.fillWeight, 0.7) };

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
        {leaves.map((leaf, i) => {
          const w = leaf.x1 - leaf.x0;
          const h = leaf.y1 - leaf.y0;
          const labelFits = showLabels && leaf.label && w >= MIN_LABEL_W && h >= MIN_LABEL_H;
          return (
            <g key={leaf.id}>
              <RoughRectangle
                x={leaf.x0}
                y={leaf.y0}
                width={w}
                height={h}
                fill={leaf.color ?? colorOf(leaf.groupId)}
                vibe={cellVibe}
                seed={i + 1}
              />
              {labelFits && (
                <RoughText x={leaf.x0 + w / 2} y={leaf.y0 + h / 2} anchor="middle" baseline="middle" maxWidth={w - 6}>
                  {leaf.label as string}
                </RoughText>
              )}
            </g>
          );
        })}
      </g>
    </Surface>
  );
}
