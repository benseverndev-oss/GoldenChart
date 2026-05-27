import { useMemo } from 'react';
import type { BaseChartProps } from '../types/charts';
import { axisAngle, polarToCartesian, polygonPath } from '../core/polar';
import { linearScale } from '../core/scales';
import { getPlotArea } from '../core/geometry';
import { colorAt } from '../core/palette';
import { layoutLegend } from '../core/legend';
import type { LegendItem } from '../core/legend';
import { resolveVibe } from '../vibe/resolveVibe';
import { Surface } from './Surface';
import { Legend } from './Legend';
import { RoughPath } from '../primitives/RoughPath';
import { RoughLine } from '../primitives/RoughLine';
import { RoughCircle } from '../primitives/RoughCircle';
import { RoughText } from '../primitives/RoughText';

export interface RadarSeries {
  id: string;
  values: number[];
  color?: string;
}

export interface RadarChartProps extends BaseChartProps {
  axes: string[];
  series: RadarSeries[];
  maxValue?: number;
  levels?: number;
  showDots?: boolean;
  showLabels?: boolean;
  /** Show a legend below the chart for multiple series. Defaults to on. */
  showLegend?: boolean;
}

/**
 * Polar multi-axis (spider) chart. `core/polar.ts` maps each value to a point on
 * its axis; a closed `<RoughPath>` draws each series over faint grid rings.
 */
export function RadarChart({
  axes,
  series,
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
  maxValue,
  levels = 4,
  showDots = true,
  showLabels = true,
  showLegend = true,
}: RadarChartProps) {
  const fullPlot = getPlotArea(width, height, margin);
  const rv = resolveVibe(vibe);
  const legendItems: LegendItem[] =
    showLegend && series.length > 1 ? series.map((s, i) => ({ label: s.id, color: s.color ?? colorAt(i) })) : [];
  const legendModel = legendItems.length
    ? layoutLegend(legendItems, fullPlot.width, { fontSize: rv.fontSize, fontFamily: rv.fontFamily })
    : null;
  const plot = legendModel ? { ...fullPlot, height: Math.max(1, fullPlot.height - legendModel.height - 36) } : fullPlot;

  const geom = useMemo(() => {
    const n = axes.length;
    const cx = plot.x + plot.width / 2;
    const cy = plot.y + plot.height / 2;
    const radius = Math.max(0, Math.min(plot.width, plot.height) / 2 - 28);

    const dataMax = Math.max(1, ...series.flatMap((s) => s.values));
    const max = maxValue ?? dataMax;
    const rScale = linearScale([0, max], [0, radius]);

    const rings = Array.from({ length: levels }, (_, l) => {
      const r = (radius * (l + 1)) / levels;
      return polygonPath(Array.from({ length: n }, (_, i) => polarToCartesian(cx, cy, r, axisAngle(i, n))));
    });

    const spokes = Array.from({ length: n }, (_, i) => polarToCartesian(cx, cy, radius, axisAngle(i, n)));
    const labels = Array.from({ length: n }, (_, i) => ({
      label: axes[i],
      ...polarToCartesian(cx, cy, radius + 18, axisAngle(i, n)),
    }));

    const seriesGeom = series.map((s) => {
      const pts = axes.map((_, i) => polarToCartesian(cx, cy, rScale(s.values[i] ?? 0), axisAngle(i, n)));
      return { id: s.id, color: s.color, path: polygonPath(pts), points: pts };
    });

    return { cx, cy, rings, spokes, labels, seriesGeom };
  }, [axes, series, maxValue, levels, plot.x, plot.y, plot.width, plot.height]);

  const faint = { roughness: 0.5, fill: null, disableMultiStroke: true } as const;

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
      {geom.rings.map((d, i) => (
        <RoughPath key={`ring-${i}`} d={d} fill={null} vibe={faint} seed={i + 1} />
      ))}
      {geom.spokes.map((p, i) => (
        <RoughLine key={`spoke-${i}`} x1={geom.cx} y1={geom.cy} x2={p.x} y2={p.y} vibe={faint} seed={i + 1} />
      ))}
      {geom.seriesGeom.map((s, i) => (
        <g key={s.id}>
          {/* Multiple series overlap, so draw outline-only (filled hachure of two
              series tangles into noise); a single series keeps its fill. */}
          <RoughPath
            d={s.path}
            stroke={s.color ?? colorAt(i)}
            fill={series.length > 1 ? null : (s.color ?? colorAt(i))}
            vibe={{ fillStyle: 'hachure', fillWeight: 1 }}
            style={{ opacity: series.length > 1 ? 1 : 0.85 }}
            seed={i + 1}
          />
          {showDots &&
            s.points.map((p, j) => (
              <RoughCircle key={j} cx={p.x} cy={p.y} diameter={7} fill={s.color ?? colorAt(i)} seed={i * 10 + j + 1} />
            ))}
        </g>
      ))}
      {showLabels &&
        geom.labels.map((l, i) => (
          <RoughText key={`label-${i}`} x={l.x} y={l.y} anchor="middle" baseline="middle">
            {l.label}
          </RoughText>
        ))}
      {legendModel && <Legend items={legendItems} x={fullPlot.x} y={plot.y + plot.height + 30} width={fullPlot.width} />}
    </Surface>
  );
}
