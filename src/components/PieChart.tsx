import { useMemo } from 'react';
import type { BaseChartProps, ChartDatum } from '../types/charts';
import { getPlotArea } from '../core/geometry';
import { computePie } from '../core/arc';
import { colorAt } from '../core/palette';
import { resolveBrand } from '../brand/resolveBrand';
import { datumTable } from '../core/dataTable';
import { resolveVibe } from '../vibe/resolveVibe';
import { Surface } from './Surface';
import { RoughPath } from '../primitives/RoughPath';
import { RoughText } from '../primitives/RoughText';
import { markAttrs } from '../core/interaction';

export interface PieChartProps extends BaseChartProps {
  data: ChartDatum[];
  /** 0 = pie, > 0 = donut (px). */
  innerRadius?: number;
  padAngle?: number;
  showLabels?: boolean;
}

/**
 * Pie / donut chart. d3-shape's `arc`+`pie` emit each slice's path string at the
 * origin; we translate to the plot center and let `<RoughPath>` sketch them.
 */
export function PieChart({
  data,
  width,
  height,
  margin,
  vibe,
  brand,
  title,
  description,
  ariaLabel,
  dataTable,
  className,
  style,
  bare,
  innerRadius = 0,
  padAngle = 0.02,
  showLabels = true,
}: PieChartProps) {
  const plot = getPlotArea(width, height, margin);
  const cx = plot.x + plot.width / 2;
  const cy = plot.y + plot.height / 2;
  const outerRadius = Math.max(0, Math.min(plot.width, plot.height) / 2 - 2);
  // Labels sit over the (hachured, coloured) slices; give them a page-colour
  // halo so they stay legible regardless of vibe/slice colour.
  const haloColor = resolveVibe(vibe).background ?? '#ffffff';
  const palette = resolveBrand(brand).palette;

  const slices = useMemo(
    () => computePie(data, outerRadius, innerRadius, padAngle),
    [data, outerRadius, innerRadius, padAngle],
  );

  return (
    <Surface
      width={width}
      height={height}
      vibe={vibe}
      brand={brand}
      title={title}
      description={description}
      ariaLabel={ariaLabel}
      dataTable={dataTable ? datumTable(data, title) : undefined}
      className={className}
      style={style}
      bare={bare}
    >
      <g transform={`translate(${cx}, ${cy})`}>
        {slices.map((slice) => (
          <g key={slice.datum.label}>
            <RoughPath
              d={slice.path}
              fill={slice.datum.color ?? colorAt(slice.index, palette)}
              seed={slice.index + 1}
              dataAttrs={markAttrs({
                kind: 'slice',
                index: slice.index,
                label: slice.datum.label,
                value: slice.datum.value,
                cx: cx + slice.centroid[0],
                cy: cy + slice.centroid[1],
              })}
            />
            {showLabels && slice.endAngle - slice.startAngle > 0.15 && (
              <RoughText
                x={slice.centroid[0]}
                y={slice.centroid[1]}
                anchor="middle"
                baseline="middle"
                haloColor={haloColor}
              >
                {slice.datum.label}
              </RoughText>
            )}
          </g>
        ))}
      </g>
    </Surface>
  );
}
