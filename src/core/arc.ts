import { arc as d3arc, pie as d3pie } from 'd3-shape';
import type { PieArcDatum } from 'd3-shape';
import type { ChartDatum } from '../types/charts';

export interface PieSlice {
  /** SVG path `d` for the slice, ready to hand to `<RoughPath>`. */
  path: string;
  /** Label anchor point, in the same local coords as `path`. */
  centroid: [number, number];
  startAngle: number;
  endAngle: number;
  datum: ChartDatum;
  index: number;
}

/**
 * Turn category values into pie/donut slice geometry using d3-shape. Pure and
 * DOM-free; coordinates are centered on (0, 0), so the renderer translates to
 * the chart center. `innerRadius > 0` yields a donut.
 */
export function computePie(
  data: ChartDatum[],
  outerRadius: number,
  innerRadius = 0,
  padAngle = 0,
): PieSlice[] {
  const pieGen = d3pie<ChartDatum>()
    .value((d) => d.value)
    .padAngle(padAngle)
    .sort(null);

  const arcGen = d3arc<PieArcDatum<ChartDatum>>().innerRadius(innerRadius).outerRadius(outerRadius);

  return pieGen(data).map((slice, index) => ({
    path: arcGen(slice) ?? '',
    centroid: arcGen.centroid(slice),
    startAngle: slice.startAngle,
    endAngle: slice.endAngle,
    datum: slice.data,
    index,
  }));
}
