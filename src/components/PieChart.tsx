import { useMemo } from 'react';
import type { BaseChartProps, ChartDatum } from '../types/charts';
import { getPlotArea } from '../core/geometry';
import { computePie } from '../core/arc';
import { colorAt } from '../core/palette';
import { Surface } from './Surface';
import { RoughPath } from '../primitives/RoughPath';
import { RoughText } from '../primitives/RoughText';

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
  title,
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

  const slices = useMemo(
    () => computePie(data, outerRadius, innerRadius, padAngle),
    [data, outerRadius, innerRadius, padAngle],
  );

  return (
    <Surface width={width} height={height} vibe={vibe} title={title} className={className} style={style} bare={bare}>
      <g transform={`translate(${cx}, ${cy})`}>
        {slices.map((slice) => (
          <g key={slice.datum.label}>
            <RoughPath
              d={slice.path}
              fill={slice.datum.color ?? colorAt(slice.index)}
              seed={slice.index + 1}
            />
            {showLabels && slice.endAngle - slice.startAngle > 0.15 && (
              <RoughText x={slice.centroid[0]} y={slice.centroid[1]} anchor="middle" baseline="middle">
                {slice.datum.label}
              </RoughText>
            )}
          </g>
        ))}
      </g>
    </Surface>
  );
}
