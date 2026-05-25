import { useMemo } from 'react';
import type { BaseChartProps, ChartDatum } from '../types/charts';
import { bandScale, linearScale, extentOf } from '../core/scales';
import { getPlotArea } from '../core/geometry';
import { Surface } from './Surface';
import { RoughRectangle } from '../primitives/RoughRectangle';
import { useVibeContext } from '../vibe/VibeProvider';

export interface BarChartProps extends BaseChartProps {
  data: ChartDatum[];
}

/**
 * Demonstrates the full pipeline end to end: d3-scale computes bar geometry,
 * `<RoughRectangle>` draws each bar with the inherited vibe. No D3 DOM, no
 * Rough.js outside the primitives.
 */
export function BarChart({ data, width, height, margin, vibe, title, className, style }: BarChartProps) {
  const plot = getPlotArea(width, height, margin);

  const bars = useMemo(() => {
    const x = bandScale(data.map((d) => d.label), [plot.x, plot.x + plot.width]);
    const y = linearScale(extentOf(data.map((d) => d.value)), [plot.y + plot.height, plot.y]);
    const baseline = y(0);

    return data.map((d) => {
      const top = y(d.value);
      return {
        label: d.label,
        color: d.color,
        x: x(d.label) ?? plot.x,
        y: Math.min(top, baseline),
        width: x.bandwidth(),
        height: Math.abs(baseline - top),
      };
    });
  }, [data, plot.x, plot.y, plot.width, plot.height]);

  return (
    <Surface width={width} height={height} vibe={vibe} title={title} className={className} style={style}>
      {bars.map((bar, i) => (
        <BarChartBar key={bar.label} bar={bar} index={i} />
      ))}
    </Surface>
  );
}

function BarChartBar({ bar, index }: { bar: { x: number; y: number; width: number; height: number; color?: string }; index: number }) {
  const vibe = useVibeContext();
  // Vary the seed per bar so identical heights still look hand-drawn, not cloned.
  return (
    <RoughRectangle
      x={bar.x}
      y={bar.y}
      width={bar.width}
      height={bar.height}
      fill={bar.color ?? vibe.fill}
      seed={vibe.seed + index}
    />
  );
}
