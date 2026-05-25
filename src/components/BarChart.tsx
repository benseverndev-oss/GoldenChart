import { useMemo } from 'react';
import type { BaseChartProps, ChartDatum } from '../types/charts';
import { bandScale, linearScale, extentOf } from '../core/scales';
import { getPlotArea } from '../core/geometry';
import { Surface } from './Surface';
import { Axis } from './Axis';
import { Grid } from './Grid';
import { RoughRectangle } from '../primitives/RoughRectangle';
import { useVibeContext } from '../vibe/VibeProvider';

export interface BarChartProps extends BaseChartProps {
  data: ChartDatum[];
  showAxes?: boolean;
  showGrid?: boolean;
}

/**
 * The reference chart for the calc/render split: d3-scale computes bar geometry,
 * `<RoughRectangle>` draws each bar. No D3 DOM, no Rough.js outside the
 * primitives.
 */
export function BarChart({
  data,
  width,
  height,
  margin,
  vibe,
  title,
  className,
  style,
  showAxes = true,
  showGrid = true,
}: BarChartProps) {
  const plot = getPlotArea(width, height, margin);

  const { x, y, bars } = useMemo(() => {
    const xScale = bandScale(data.map((d) => d.label), [plot.x, plot.x + plot.width]);
    const yScale = linearScale(extentOf(data.map((d) => d.value)), [plot.y + plot.height, plot.y]);
    const baseline = yScale(0);

    const computed = data.map((d) => {
      const top = yScale(d.value);
      return {
        label: d.label,
        color: d.color,
        x: xScale(d.label) ?? plot.x,
        y: Math.min(top, baseline),
        width: xScale.bandwidth(),
        height: Math.abs(baseline - top),
      };
    });

    return { x: xScale, y: yScale, bars: computed };
  }, [data, plot.x, plot.y, plot.width, plot.height]);

  return (
    <Surface width={width} height={height} vibe={vibe} title={title} className={className} style={style}>
      {showGrid && <Grid plot={plot} yScale={y} />}
      {bars.map((bar, i) => (
        <BarChartBar key={bar.label} bar={bar} index={i} />
      ))}
      {showAxes && (
        <>
          <Axis scale={x} orientation="bottom" plot={plot} />
          <Axis scale={y} orientation="left" plot={plot} />
        </>
      )}
    </Surface>
  );
}

function BarChartBar({
  bar,
  index,
}: {
  bar: { x: number; y: number; width: number; height: number; color?: string };
  index: number;
}) {
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
