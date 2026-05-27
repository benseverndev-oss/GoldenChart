import { useMemo } from 'react';
import type { BaseChartProps } from '../types/charts';
import type { ColorScaleName } from '../core/colorScales';
import { sequentialColor, vibeColorScale } from '../core/colorScales';
import { resolveVibe } from '../vibe/resolveVibe';
import { bandScale } from '../core/scales';
import { getPlotArea } from '../core/geometry';
import { Surface } from './Surface';
import { Axis } from './Axis';
import { RoughRectangle } from '../primitives/RoughRectangle';
import { RoughText } from '../primitives/RoughText';

export interface HeatmapDatum {
  x: string | number;
  y: string | number;
  value: number;
}

export interface HeatmapChartProps extends BaseChartProps {
  data: HeatmapDatum[];
  xLabels?: (string | number)[];
  yLabels?: (string | number)[];
  colorScale?: ColorScaleName | ((value: number) => string);
  showValues?: boolean;
  showAxes?: boolean;
}

function uniqueInOrder(values: (string | number)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const s = String(v);
    if (!seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

/**
 * Grid of cells colored by value on a sequential color scale. Band scales place
 * the cells; `<RoughRectangle>` draws each one.
 */
export function HeatmapChart({
  data,
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
  xLabels,
  yLabels,
  colorScale,
  showValues = false,
  showAxes = true,
}: HeatmapChartProps) {
  const plot = getPlotArea(width, height, margin);
  // Default to a monochrome ramp in the vibe's own hue so the heatmap matches
  // the theme; an explicit `colorScale` (named or function) still wins.
  const resolved = resolveVibe(vibe);
  const themeColor = resolved.fill ?? resolved.stroke;

  const { cells, x, y } = useMemo(() => {
    const xDomain = xLabels ? xLabels.map(String) : uniqueInOrder(data.map((d) => d.x));
    const yDomain = yLabels ? yLabels.map(String) : uniqueInOrder(data.map((d) => d.y));
    const xScale = bandScale(xDomain, [plot.x, plot.x + plot.width], 0.06);
    const yScale = bandScale(yDomain, [plot.y, plot.y + plot.height], 0.06);

    const values = data.map((d) => d.value);
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 1;
    const color =
      typeof colorScale === 'function'
        ? colorScale
        : colorScale
          ? sequentialColor(colorScale, [min, max])
          : vibeColorScale(themeColor, [min, max]);

    const computed = data.map((d) => ({
      key: `${d.x}:${d.y}`,
      x: xScale(String(d.x)) ?? plot.x,
      y: yScale(String(d.y)) ?? plot.y,
      width: xScale.bandwidth(),
      height: yScale.bandwidth(),
      fill: color(d.value),
      value: d.value,
    }));

    return { cells: computed, x: xScale, y: yScale };
  }, [data, xLabels, yLabels, colorScale, themeColor, plot.x, plot.y, plot.width, plot.height]);

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
      {cells.map((cell, i) => (
        <g key={cell.key}>
          <RoughRectangle
            x={cell.x}
            y={cell.y}
            width={cell.width}
            height={cell.height}
            fill={cell.fill}
            vibe={{ roughness: 0.5, fillStyle: 'solid', disableMultiStroke: true }}
            seed={i + 1}
          />
          {showValues && (
            <RoughText x={cell.x + cell.width / 2} y={cell.y + cell.height / 2} anchor="middle" baseline="middle">
              {String(cell.value)}
            </RoughText>
          )}
        </g>
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
