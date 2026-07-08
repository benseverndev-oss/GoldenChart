import { useMemo } from 'react';
import type { BaseChartProps } from '../types/charts';
import type { ColorScaleName } from '../core/colorScales';
import { sequentialColor, vibeColorScale } from '../core/colorScales';
import { resolveVibe } from '../vibe/resolveVibe';
import { getPlotArea } from '../core/geometry';
import { Surface } from './Surface';
import { RoughPath } from '../primitives/RoughPath';
import { US_STATES_GEOMETRY, US_STATES_VIEWBOX } from '../usStates';

export interface ChoroplethDatum {
  region: string; // 2-letter USPS code
  value: number;
}

export interface ChoroplethMapProps extends BaseChartProps {
  data: ChoroplethDatum[];
  colorScale?: ColorScaleName | ((v: number) => string);
}

/**
 * US-states choropleth: each state's pre-projected outline is filled by its
 * value on a sequential (or the vibe's monochrome) color scale. Structurally a
 * heatmap whose cells are region polygons.
 */
export function ChoroplethMap({
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
  colorScale,
}: ChoroplethMapProps) {
  const plot = getPlotArea(width, height, margin);
  const resolved = resolveVibe(vibe);
  const themeColor = resolved.fill ?? resolved.stroke;

  const { regions, transform } = useMemo(() => {
    const byRegion = new Map(data.map((d) => [d.region.toUpperCase(), d.value]));
    const values = data.map((d) => d.value);
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 1;
    const color =
      typeof colorScale === 'function'
        ? colorScale
        : colorScale
          ? sequentialColor(colorScale, [min, max])
          : vibeColorScale(themeColor, [min, max]);

    // Fit the fixed 960x600 geometry into the plot area, preserving aspect.
    const s = Math.min(
      plot.width / US_STATES_VIEWBOX.width,
      plot.height / US_STATES_VIEWBOX.height,
    );
    const tx = plot.x + (plot.width - US_STATES_VIEWBOX.width * s) / 2;
    const ty = plot.y + (plot.height - US_STATES_VIEWBOX.height * s) / 2;

    const regions = Object.entries(US_STATES_GEOMETRY).map(([code, d]) => {
      const v = byRegion.get(code);
      return { code, d, fill: v === undefined ? '#e5e7eb' : color(v) };
    });
    return { regions, transform: `translate(${tx},${ty}) scale(${s})` };
  }, [data, colorScale, themeColor, plot.x, plot.y, plot.width, plot.height]);

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
      <g transform={transform}>
        {regions.map((r, i) => (
          <RoughPath
            key={r.code}
            d={r.d}
            fill={r.fill}
            vibe={{ roughness: 0.5, fillStyle: 'solid', disableMultiStroke: true }}
            seed={i + 1}
          />
        ))}
      </g>
    </Surface>
  );
}
